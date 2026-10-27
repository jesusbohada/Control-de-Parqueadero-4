#!/usr/bin/env bash
# ==============================================================================
# Script de Actualización Rápida - WolfZone POS (Servidor Linux)
# Actualiza el código de software desde GitHub y reconstruye el contenedor Docker
# Sin tocar ni alterar los datos operativos ni la base de datos.
# ==============================================================================

set -e

echo "====================================================================="
echo "   🔄 ACTUALIZADOR DE SOFTWARE - WOLFZONE POS (LINUX / DOCKER)       "
echo "====================================================================="
echo ""

# 1. Obtener última versión del código fuente desde GitHub
echo "[1/3] Descargando última versión de software desde GitHub..."
git pull origin main

# 2. Detectar herramienta Docker Compose
echo ""
echo "[2/3] Verificando entorno Docker..."
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "[ERROR] Docker Compose no está disponible en este sistema."
    exit 1
fi

# 3. Reconstruir contenedor de la aplicación con la nueva versión
echo ""
echo "[3/3] Reconstruyendo y actualizando contenedor de la aplicación (Node 20)..."
${DOCKER_COMPOSE_CMD} up -d --build app

echo ""
echo "====================================================================="
echo "   ✅ ¡ACTUALIZACIÓN COMPLETADA CON ÉXITO!                          "
echo "====================================================================="
${DOCKER_COMPOSE_CMD} ps app
echo ""
echo "Tu base de datos y datos operativos permanecen intactos."
echo "La nueva versión del software ya está activa en http://localhost:3000"
echo "====================================================================="
