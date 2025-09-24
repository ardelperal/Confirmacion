# Dockerfile para la aplicación de Confirmación
FROM node:18-alpine AS base

# Instalar dependencias necesarias (incluyendo git para submódulos)
RUN apk add --no-cache curl git
WORKDIR /app

# Instalar dependencias
FROM base AS deps
COPY web/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Construir la aplicación
FROM base AS builder
WORKDIR /app

# Copiar el repositorio completo (incluyendo submódulos)
COPY . .

# Verificar si es un repositorio git antes de inicializar submódulos
RUN if [ -d ".git" ]; then git submodule update --init --recursive; fi

# Instalar dependencias de desarrollo
COPY web/package*.json ./web/
RUN cd web && npm ci

# Ejecutar sincronización de catequesis si existe el script
RUN if [ -f "package.json" ] && npm run --silent sync:catequesis 2>/dev/null; then echo "Sync completed"; else echo "Sync script not found, skipping"; fi

# Construir la aplicación
RUN cd web && npm run build

# Imagen de producción
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Instalar curl para health checks
RUN apk add --no-cache curl

# Copiar archivos necesarios desde el builder
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./web/public

# Copiar archivos de contenido (sesiones, módulos, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/external ./external

# Crear directorios para contenido y logs
RUN mkdir -p /app/content /app/logs
RUN chown -R nextjs:nodejs /app/content /app/logs /app/data

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