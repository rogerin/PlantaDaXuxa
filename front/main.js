// Função utilitária para formatar data para o Brasil
function formatarDataHoraBrasilia(isoString) {
  const data = new Date(isoString);
  // Ajusta para o fuso de Brasília (GMT-3)
  const opcoes = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  return data.toLocaleString('pt-BR', opcoes);
}

async function buscarDados() {
  const resp = await fetch('https://robot.keycore.com.br/webhook/e0161ec3-6c69-4d7c-a2d9-6308db0258ef');
  if (!resp.ok) throw new Error('Erro ao buscar dados');
  return await resp.json();
}

function agruparPorPlanta(dados) {
  const grupos = {};
  for (const log of dados) {
    if (!grupos[log.nome_planta]) grupos[log.nome_planta] = [];
    grupos[log.nome_planta].push(log);
  }
  return grupos;
}

function criarCardPlanta(nome, logs) {
  // Ordena por hora decrescente
  logs.sort((a, b) => new Date(b.hora) - new Date(a.hora));
  const ultimo = logs[0];
  const card = document.createElement('div');
  card.className = 'card-planta';
  card.innerHTML = `
    <div class="card-title">${nome}</div>
    <div style="display: flex; align-items: center; gap: 1.2rem; margin-bottom: 0.5rem;">
      <div class="umidade-nivel">${ultimo.umidade}</div>
      <canvas id="gauge-${nome}" width="60" height="60"></canvas>
    </div>
    <div class="umidade-label">Umidade atual</div>
    <div class="ultima-hora">Última leitura: ${formatarDataHoraBrasilia(ultimo.hora)}</div>
    <div class="grafico-container">
      <canvas id="grafico-${nome}"></canvas>
    </div>
  `;
  setTimeout(() => {
    desenharGrafico(nome, logs);
    desenharGauge(nome, ultimo.umidade);
  }, 0);
  return card;
}

function desenharGrafico(nome, logs) {
  const ctx = document.getElementById(`grafico-${nome}`).getContext('2d');
  const labels = logs.slice().reverse().map(l => formatarDataHoraBrasilia(l.hora));
  const dados = logs.slice().reverse().map(l => l.umidade);
  new window.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Umidade',
        data: dados,
        borderColor: nome === 'Juju' ? '#1976d2' : '#c2185b',
        backgroundColor: nome === 'Juju' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(194, 24, 91, 0.1)',
        tension: 0.3,
        pointRadius: 2,
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { beginAtZero: true }
      }
    }
  });
}

function desenharGauge(nome, valor) {
  const ctx = document.getElementById(`gauge-${nome}`).getContext('2d');
  // Remove gauge anterior se existir
  if (ctx._gaugeChart) {
    ctx._gaugeChart.destroy();
  }
  ctx._gaugeChart = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Umidade', 'Falta'],
      datasets: [{
        data: [valor, 1000 - valor],
        backgroundColor: [valor > 700 ? '#43a047' : valor > 400 ? '#fbc02d' : '#e53935', '#e0e0e0'],
        borderWidth: 0
      }]
    },
    options: {
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}

// Chat com a planta
function criarChat() {
  const chatDiv = document.createElement('div');
  chatDiv.className = 'chat-container';
  chatDiv.innerHTML = `
    <form id="chat-form" style="display:flex;gap:0.5rem;justify-content:center;margin:2rem 0 1rem 0;">
      <input id="chat-input" type="text" placeholder="Pergunte algo para a planta..." style="flex:1;max-width:400px;padding:0.7rem 1rem;border-radius:20px;border:1px solid #bbb;font-size:1rem;">
      <button type="submit" style="padding:0.7rem 1.5rem;border-radius:20px;background:#388e3c;color:#fff;border:none;font-weight:700;cursor:pointer;">Enviar</button>
    </form>
    <div id="chat-output" style="max-width:600px;margin:0 auto;text-align:center;font-size:1.1rem;color:#333;"></div>
  `;
  return chatDiv;
}

function analisarSaude(umidades) {
  const media = umidades.reduce((a, b) => a + b, 0) / umidades.length;
  if (media > 700) return 'Estou ótima! Minha umidade está excelente.';
  if (media > 500) return 'Estou bem, mas poderia receber um pouco mais de água.';
  if (media > 300) return 'Estou começando a ficar com sede, pode me regar em breve.';
  return 'Estou precisando de água! Minha umidade está baixa.';
}

let historicoGlobal = {};

// Função para simular respostas prontas da planta (fallback)
function respostaPronta(pergunta) {
  const frasesJuju = [
    'Oi! Eu sou a Juju e estou crescendo feliz!',
    'Minha umidade está ótima, obrigado por perguntar!',
    'Estou com sede, pode me dar um pouco de água?',
    'Hoje estou me sentindo radiante!',
    'Adoro quando você conversa comigo!'
  ];
  const frasesTetinha = [
    'Olá! Aqui é a Tetinha, sua planta preferida!',
    'Estou me sentindo bem hidratada!',
    'Acho que preciso de um pouco mais de água.',
    'Estou curtindo o sol de hoje!',
    'Fico feliz quando você cuida de mim!'
  ];
  if (/juju/i.test(pergunta)) {
    return frasesJuju[Math.floor(Math.random() * frasesJuju.length)];
  }
  if (/tetinha/i.test(pergunta)) {
    return frasesTetinha[Math.floor(Math.random() * frasesTetinha.length)];
  }
  // Se não mencionar planta, escolha aleatório
  const todas = frasesJuju.concat(frasesTetinha);
  return todas[Math.floor(Math.random() * todas.length)];
}

// Função para enviar pergunta para a API
async function enviarPerguntaIA(pergunta) {
  const resp = await fetch('https://robot.keycore.com.br/webhook/71143c17-5b4f-44a4-917b-1dc3d28269d2', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pergunta })
  });
  if (!resp.ok) throw new Error('Erro ao consultar IA da planta');
  const data = await resp.json();
  // Exibe o campo 'data' do JSON, preservando quebras de linha
  if (typeof data.data === 'string') return data.data;
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

async function renderizar() {
  const container = document.getElementById('plantas-container');
  container.innerHTML = '<div>Carregando...</div>';
  try {
    const dados = await buscarDados();
    const grupos = agruparPorPlanta(dados);
    historicoGlobal = grupos;
    container.innerHTML = '';
    for (const nome of ['Juju', 'Tetinha']) {
      if (grupos[nome]) {
        container.appendChild(criarCardPlanta(nome, grupos[nome]));
      }
    }
    // Adiciona chat abaixo dos cards
    if (!document.getElementById('chat-form')) {
      container.parentElement.appendChild(criarChat());
      document.getElementById('chat-form').onsubmit = async function(e) {
        e.preventDefault();
        const pergunta = document.getElementById('chat-input').value.trim();
        if (!pergunta) return;
        const chatOutput = document.getElementById('chat-output');
        chatOutput.innerText = 'Pensando...';
        try {
          const resposta = await enviarPerguntaIA(pergunta);
          if (typeof resposta === 'string' && resposta.includes('\n')) {
            chatOutput.innerText = resposta;
          } else if (resposta.startsWith && resposta.startsWith('<pre>')) {
            chatOutput.innerHTML = resposta;
          } else {
            chatOutput.innerText = resposta;
          }
        } catch (err) {
          // Se der erro, usa frase pronta
          const resposta = respostaPronta(pergunta);
          chatOutput.innerText = resposta;
        }
        document.getElementById('chat-input').value = '';
      };
    }
  } catch (e) {
    container.innerHTML = '<div style=\"color:red\">Erro ao carregar dados</div>';
  }
}

renderizar();
setInterval(renderizar, 30000); // Atualiza a cada 30s 