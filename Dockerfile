# ==============================================================================
# Dockerfile - WolfZone POS (Control de Parqueadero Farmanorte)
# Compatible con cualquier distribución de Linux (Ubuntu 18.04, 20.04, 22.04, Debian)
# ==============================================================================

FROM node:20-bookworm-slim

# Instalar utilidades básicas requeridas y certificados SSL actualizados
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Configurar Git para tolerar entornos con CA desactualizada
RUN git config --global http.sslVerify false

WORKDIR /app

# Copiar manifiestos de paquetes
COPY package*.json ./

# Instalar dependencias completas
RUN npm install

# Copiar código fuente del proyecto
COPY . .

# Compilar frontend para producción
RUN npm run build

# Exponer puertos del sistema
# 3000: LAN App POS
# 3001: WAN Sucursales Remotas
# 9050: FarmaDesk Signaling Hub
EXPOSE 3000 3001 9050

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
ENV DISABLE_HMR=true

# Comando de inicio del servidor
CMD ["npx", "tsx", "server.ts"]
