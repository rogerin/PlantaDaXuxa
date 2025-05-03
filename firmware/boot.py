import time
import network
import ntptime
from config import *

def conectar_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("[WiFi] Conectando à rede:", WIFI_SSID)
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        timeout = 10
        while not wlan.isconnected() and timeout > 0:
            print(f"[WiFi] Tentando conectar... ({10 - timeout + 1}/10)")
            time.sleep(1)
            timeout -= 1
    if wlan.isconnected():
        print("[WiFi] Conectado! IP:", wlan.ifconfig()[0])
        return True
    else:
        print("[WiFi] Falha ao conectar.")
        return False

def hora_brasil():
    t = time.localtime(time.time() - 3 * 3600)
    return t

# ----- BOOT START -----
print("[BOOT] Iniciando ESP32...")
if conectar_wifi():
    try:
        print("[NTP] Sincronizando hora...")
        ntptime.settime()
        print("[NTP] Hora sincronizada com sucesso!")
    except Exception as e:
        print("[NTP] Falha na sincronização:", e)

# Exibe a hora local (Brasil)
agora = hora_brasil()
print(f"[TIME] Hora Brasil: {agora[2]:02d}/{agora[1]:02d}/{agora[0]} - {agora[3]:02d}:{agora[4]:02d}:{agora[5]:02d}")