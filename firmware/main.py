import time
import random
from machine import ADC, Pin, deepsleep
import urequests
from config import *

def hora_brasil():
    return time.localtime(time.time() - 3 * 3600)

# Inicializa sensores se for modo real
if not MODO_TESTE:
    sensores = {
        planta["nome"]: ADC(Pin(planta["pino"]))
        for planta in PLANTAS
    }
    for sensor in sensores.values():
        sensor.atten(ADC.ATTN_11DB)
        sensor.width(ADC.WIDTH_10BIT)

def ler_umidade(planta_nome):
    if MODO_TESTE:
        return random.randint(300, 800)
    return sensores[planta_nome].read()

def hora_valida_para_envio(hora):
    return HORA_INICIO_ENVIO <= hora <= HORA_FIM_ENVIO

def enviar_dados(leituras):
    try:
        print("[HTTP] Enviando payload:", leituras)
        r = urequests.post(WEBHOOK_URL, json={"leituras": leituras})
        print("[HTTP] Resposta:", r.text)
        r.close()
    except Exception as e:
        print("[HTTP] Erro ao enviar:", e)

# ⏰ Hora atual
now = hora_brasil()
hora = now[3]
minuto = now[4]
hora_str = f"{hora:02d}:{minuto:02d}"

# 🔍 Logs
print(f"[DEBUG] Hora atual Brasil: {hora_str}")
print(f"[DEBUG] Minuto == 0? {minuto == 0}")
print(f"[DEBUG] Dentro da faixa horária? {hora_valida_para_envio(hora)}")

# 📊 Coleta de dados
leituras = []
for planta in PLANTAS:
    valor = ler_umidade(planta["nome"])
    print(f"[LEITURA] {planta['nome']}: {valor}")
    leituras.append({
        "planta": planta["nome"],
        "hora": hora_str,
        "umidade": valor
    })

# 📤 Envia somente se for hora cheia e dentro da faixa
if MODO_TESTE or (minuto == 0 and hora_valida_para_envio(hora)):
    print("[ENVIO] Enviando dados para o webhook...")
    enviar_dados(leituras)
else:
    print("[INFO] Condições não atendidas. Dados não enviados.")

# 😴 Dormir
# sleep_time = 10 if MODO_TESTE else 5 * 60
sleep_time = 10

print(f"[SLEEP] Dormindo por {sleep_time} segundos...\n")
deepsleep(sleep_time * 1000)