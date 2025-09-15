# Multi-stage build para optimizar tamaño de imagen
# Etapa 1: Build
FROM node:20-alpine AS builder

# Instalar dependencias necesarias para el build
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (necesarias para el build)
RUN npm ci --no-audit --no-fund

# Copiar código fuente
COPY . .

# Crear directorio temporal para el build
RUN mkdir -p /data/content
RUN echo 'modules: []' > /data/content/modules.yml

# Build de la aplicación
RUN npm run build && npm cache clean --force

# Etapa 2: Runtime
FROM node:20-alpine AS runner

# Instalar dependencias de runtime para Puppeteer/Chrome
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    && rm -rf /var/cache/apk/*

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Crear usuario no-root con UID/GID específicos
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copiar package.json e instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund && npm cache clean --force

# Copiar archivos necesarios desde el builder
    COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
    COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
    COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Los archivos de contenido se montarán como volumen en runtime

# Crear directorio de contenido con permisos correctos
RUN mkdir -p /app/content && chown -R nextjs:nodejs /app

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno para producción
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Healthcheck para verificar que la aplicación responde
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application using standalone mode
CMD ["node", "server.js"]