# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --prefer-offline; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
    elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \
    else npm i --no-audit; fi

# ---------- build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar git para manejar submódulos
RUN apk add --no-cache git

# Copiar el repositorio completo desde el contexto raíz
COPY ../ ../

# Cambiar al directorio web y copiar node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Inicializar submódulos git desde la raíz del proyecto
RUN cd ../ && git submodule update --init --recursive

# Crear estructura de directorios necesaria para el build
RUN mkdir -p ../data/content
RUN echo 'modules: []' > ../data/content/modules.yml

# Sincronizar recursos de catequesis antes del build
RUN cd ../ && npm run sync:catequesis

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --if-present || npx next build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Usuario no root
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

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

# Copiar archivos de build
    COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
    COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Crear directorio de contenido con permisos correctos
RUN mkdir -p /app/content && chown -R nextjs:nextjs /app

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno adicionales
ENV HOSTNAME="0.0.0.0"

# Healthcheck para verificar que la aplicación responde
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application using standalone mode
CMD ["node", "server.js"]