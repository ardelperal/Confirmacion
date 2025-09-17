# syntax=docker/dockerfile:1

# Stage 1: Instalar dependencias
FROM node:20-bookworm AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY web/package.json web/package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Construir la aplicación
FROM node:20-bookworm AS builder
WORKDIR /app

# Instalar git para submódulos
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copiar el repositorio completo (incluyendo submódulos)
COPY . .

# Inicializar submódulos git
RUN git submodule update --init --recursive

# Instalar todas las dependencias (incluyendo devDependencies)
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci

# Ejecutar sincronización de catequesis
RUN npm run sync:catequesis

# Construir la aplicación con output standalone
RUN cd web && npm run build

# Stage 3: Imagen de producción
FROM node:20-bookworm-slim AS runner

# Variables de entorno
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0

WORKDIR /app

# Instalar curl para healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root
RUN useradd -m -u 10001 nodeuser

# Copiar archivos de la aplicación standalone
COPY --from=builder --chown=nodeuser:nodeuser /app/web/.next/standalone ./
COPY --from=builder --chown=nodeuser:nodeuser /app/web/.next/static ./.next/static
COPY --from=builder --chown=nodeuser:nodeuser /app/web/public ./public

# Copiar datos (se puede montar como volumen en compose para persistencia)
COPY --from=builder --chown=nodeuser:nodeuser /app/data ./data

# Crear directorios necesarios
RUN mkdir -p /app/content /app/logs && chown -R nodeuser:nodeuser /app/content /app/logs

# Cambiar a usuario no-root
USER nodeuser

# Exponer puerto
EXPOSE 3001

# Healthcheck usando Node.js fetch (disponible en Node 20+)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Comando de inicio
CMD ["node", "server.js"]