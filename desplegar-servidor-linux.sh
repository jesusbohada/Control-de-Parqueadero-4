#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue Automatizado para Servidor Linux (Kubuntu / Ubuntu / Debian)
# Servidor: Intel Xeon 6 Cores | 55 GB RAM
# ==============================================================================

set -e

echo "====================================================================="
echo "   INSTALADOR Y DESPLEGADOR AUTOMATIZADO - WOLFZONE POS (LINUX)      "
echo "====================================================================="
echo ""

# Verificar si se ejecuta con permisos sudo
if [ "$EUID" -ne 0 ]; then
  echo "[INFO] Por favor ejecuta este script con permisos sudo:"
  echo "       sudo bash desplegar-servidor-linux.sh"
  exit 1
fi

# Detectar IP local del servidor
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "[+] IP Detectada en la red local: ${SERVER_IP}"
echo ""

# 1. Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "[*] Docker no detectado. Preparando instalacion de Docker..."

    # Limpiar repositorios obsoletos de terceros que puedan bloquear apt (ej. megasync viejo)
    if [ -d "/etc/apt/sources.list.d" ]; then
        for f in /etc/apt/sources.list.d/*mega* /etc/apt/sources.list.d/*MEGA*; do
            if [ -f "$f" ]; then
                echo "[INFO] Moviendo repositorio obsoleto que bloqueaba apt: $f"
                mkdir -p /tmp/apt-obsoletos
                mv "$f" /tmp/apt-obsoletos/ 2>/dev/null || true
            fi
        done
    fi

    # Actualizar listas de paquetes tolerando advertencias de repositorios antiguos
    apt-get update || true
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release || true
    
    # Agregar llave GPG oficial de Docker
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes 2>/dev/null || true
    
    # Agregar repositorio según la distribución (bionic, focal, jammy, etc.)
    UBUNTU_CODENAME=$(lsb_release -cs 2>/dev/null || echo "bionic")
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME} stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Instalar Docker Engine (si falla Docker CE oficial por versiones descontinuadas de bionic, usa docker.io oficial de Ubuntu)
    apt-get update || true
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || \
    apt-get install -y docker-ce docker-ce-cli containerd.io 2>/dev/null || \
    apt-get install -y docker.io
    
    systemctl enable docker
    systemctl start docker
    echo "[OK] Docker instalado y en ejecución."
else
    echo "[OK] Docker ya está instalado en el servidor."
fi

# 2. Verificar soporte de docker compose (plugin o binario independiente)
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "[*] Instalando docker-compose..."
    curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    DOCKER_COMPOSE_CMD="docker-compose"
fi

echo "[OK] Herramienta compose lista: ${DOCKER_COMPOSE_CMD}"
echo ""

# 3. Crear carpetas de persistencia de datos y backups
echo "[*] Preparando carpetas de datos locales..."
mkdir -p backups logs data/postgres

# 4. Construir y levantar contenedores en segundo plano
echo "[*] Levantando Servidor WolfZone POS y Base de Datos PostgreSQL 16..."
${DOCKER_COMPOSE_CMD} up -d --build

echo ""
echo "====================================================================="
echo "   🟢 ¡SERVIDOR CENTRAL WOLFZONE POS OPERATIVO EN KUBUNTU!           "
echo "====================================================================="
echo ""
echo "  🌐 Acceso desde las Taquillas / Cajas en la Red Local (LAN):"
echo "     ==>  http://${SERVER_IP}:3000"
echo ""
echo "  🌍 Acceso para Sucursales Remotas (WAN):"
echo "     ==>  http://${SERVER_IP}:3001"
echo ""
echo "  💾 Motor de Base de Datos PostgreSQL 16:"
echo "     ==>  Puerto 5432 (Contenedor wolfzone_postgres)"
echo ""
echo "  🐺 FarmaDesk Hub de Asistencia Remota:"
echo "     ==>  ws://${SERVER_IP}:9050/ws"
echo ""
echo "  Comandos útiles en la terminal de Kubuntu:"
echo "   - Ver logs en vivo    : ${DOCKER_COMPOSE_CMD} logs -f"
echo "   - Reiniciar servidor  : ${DOCKER_COMPOSE_CMD} restart"
echo "   - Detener servidor    : ${DOCKER_COMPOSE_CMD} down"
echo "====================================================================="
