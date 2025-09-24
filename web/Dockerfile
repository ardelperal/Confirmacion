########## deps ##########
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
# Instalar dependencias del proyecto web (Next.js)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm install --production=false; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
    elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \
    else npm i; fi

########## build ##########
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git

# Copiar archivos necesarios
COPY package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Reutilizar node_modules del stage deps para acelerar el build
# Construir la aplicación Next.js

# Preparar contenido mínimo
RUN mkdir -p ./data/content \
 && echo 'modules: []' > ./data/content/modules.yml

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

########## runtime ##########
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Usuario no root y utilidades para healthcheck
# Instalar dependencias necesarias para Playwright y Chromium
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs \
 && apk add --no-cache \
    curl \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
 && rm -rf /var/cache/apk/*

# Configurar Chromium para Playwright
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copiar artefactos standalone generados por Next
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Directorios de datos y permisos
RUN mkdir -p /app/content /app/data/logs \
 && chown -R nextjs:nextjs /app

USER nextjs
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "web/server.js"]
