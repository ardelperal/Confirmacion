# Dockerfile para la aplicación de Confirmación
FROM node:18 AS base

# Instalar dependencias necesarias (incluyendo git para submódulos)
RUN apt-get update && apt-get install -y curl git && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Instalar dependencias
FROM base AS deps
COPY web/package*.json ./
RUN npm ci --only=production

# Construir la aplicación
FROM base AS builder
WORKDIR /app

# Copiar el repositorio completo (incluyendo submódulos)
COPY . .

# Inicializar submódulos git
RUN git submodule update --init --recursive

# Instalar dependencias de desarrollo
COPY web/package*.json ./web/
RUN cd web && npm ci

# Ejecutar sincronización de catequesis
RUN npm run sync:catequesis

# Construir la aplicación
RUN cd web && npm run build

# Imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Crear directorios para contenido y logs
RUN mkdir -p /app/content /app/logs
RUN chown -R nextjs:nodejs /app/content /app/logs

# Crear endpoint de health check
RUN echo '#!/bin/sh\ncurl -f http://localhost:3000/api/health || exit 1' > /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

CMD ["node", "server.js"]