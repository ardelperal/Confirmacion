# Sistema de Catequesis para Confirmación

[![CI & Security](https://github.com/${{github.repository}}/actions/workflows/ci-security.yml/badge.svg)](../../actions/workflows/ci-security.yml)

Sistema web para gestión de sesiones de catequesis dirigidas a jóvenes de 12-13 años en preparación para el sacramento de la Confirmación.

## 🚀 Despliegue en NAS

### Requisitos
- Docker y Docker Compose instalados
- Puerto 8080 disponible para la aplicación web
- Puerto 3001 disponible para el servicio Gotenberg (PDF)

### Configuración inicial

1. **Clonar el repositorio:**
   ```bash
   git clone <repository-url>
   cd Confirmacion
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp web/.env.sample .env
   ```
   
   Editar `.env` con los valores de producción:
   ```env
   # Configuración de la aplicación
   BASE_URL=http://192.168.1.100:8080
   NODE_ENV=production
   
   # Autenticación (CAMBIAR CONTRASEÑA)
   ADMIN_PASSWORD=MiClaveSegura2024!
   JWT_SECRET=tu-clave-jwt-muy-segura-minimo-32-caracteres
   
   # Configuración de contenido
   READ_ONLY=false
   VISIBILITY_MODE=publish
   
   # Servicios externos
   GOTENBERG_URL=http://gotenberg:3000
   ```

3. **Crear directorios de datos:**
   ```bash
   mkdir -p data/content data/logs
   ```

4. **Copiar contenido inicial:**
   ```bash
   cp -r web/content/* data/content/
   ```

### Despliegue

```bash
# Levantar los servicios
docker compose up -d

# Verificar que están funcionando
docker compose ps
docker compose logs web
```

## 🧪 Pasos de Prueba

### 1. Verificación inicial

1. **Acceder a la aplicación:**
   - Abrir navegador en `http://192.168.1.100:8080`
   - Verificar que la portada carga correctamente
   - Confirmar que solo aparecen sesiones publicadas (inicialmente ninguna)

2. **Verificar API pública:**
   ```bash
   curl http://192.168.1.100:8080/api/index.json
   ```
   Debe devolver array vacío `[]` (no hay sesiones publicadas)

### 2. Pruebas de administración

1. **Login de administrador:**
   - Ir a `http://192.168.1.100:8080/login`
   - Introducir la contraseña configurada en `ADMIN_PASSWORD`
   - Verificar redirección a `/admin`

2. **Edición de sesión:**
   - En `/admin`, hacer clic en "Editar" en la sesión A1
   - Modificar el título o contenido
   - Hacer clic en "Guardar" → verificar que `status` sigue siendo "draft"
   - Verificar que aparece mensaje de confirmación

3. **Publicación de sesión:**
   - Hacer clic en "Publicar" → verificar que `status` cambia a "published"
   - Ir a la portada → verificar que la sesión A1 ahora aparece
   - Verificar API: `curl http://192.168.1.100:8080/api/index.json`

4. **Retirar sesión:**
   - Volver a `/admin`, abrir A1
   - Hacer clic en "Retirar" → verificar que `status` vuelve a "draft"
   - Verificar que desaparece de la portada

### 3. Modo de visibilidad alternativo

1. **Cambiar a modo "edited":**
   ```bash
   # Editar .env
   VISIBILITY_MODE=edited
   
   # Reiniciar contenedor
   docker compose restart web
   ```

2. **Verificar comportamiento:**
   - Las sesiones editadas (con `editedBy != null`) aparecen en vista pública
   - Aunque el `status` sea "draft"
   - Los botones "Publicar/Retirar" siguen disponibles en admin

### 4. Modo solo lectura

1. **Activar modo READ_ONLY:**
   ```bash
   # Editar .env
   READ_ONLY=true
   
   # Reiniciar
   docker compose restart web
   ```

2. **Verificar restricciones:**
   - `/admin` redirige a la portada
   - APIs `/api/admin/*` devuelven error 403
   - Vista pública sigue funcionando normalmente

## 📁 Estructura del Proyecto

```
Confirmacion/
├── web/                    # Aplicación Next.js
├── data/
│   ├── content/           # Contenido de sesiones (modificable por párroco)
│   │   ├── sessions/      # Archivos .md de sesiones
│   │   └── modules.yml    # Configuración de módulos
│   └── auth/              # Autenticación del párroco
├── docker-compose.yml     # Configuración Docker
├── .env                   # Variables de entorno
├── backup.ps1             # Script de backup automatizado
├── restore.ps1            # Script de restauración
├── BACKUP_SISTEMA.md      # Documentación del sistema de backup
└── README.md             # Este archivo
```

## 📁 Estructura de Datos

```
data/
├── content/
│   ├── sessions/          # Archivos .md de sesiones
│   └── modules.yml        # Configuración de módulos
└── logs/
    └── audit.log          # Log de auditoría
```

## 🔒 Backup y Seguridad

### Sistema de Backup
```powershell
# Crear backup de todos los datos del párroco
.\backup.ps1 -Compress

# Restaurar desde backup
.\restore.ps1 -BackupPath "./backups/backup.zip"
```
- **Incluye**: Sesiones, configuración, autenticación del párroco
- **Documentación completa**: Ver `BACKUP_SISTEMA.md`
- **Programación automática**: Tareas programadas o cron

### Backup automático (configurar en NAS)

```bash
# Ejemplo de script de backup diario
#!/bin/bash
BACKUP_DIR="/volume1/backups/confirmacion"
DATE=$(date +%Y%m%d_%H%M%S)

# Crear backup
tar -czf "$BACKUP_DIR/confirmacion_$DATE.tar.gz" \
  -C /volume1/docker/confirmacion \
  data/ .env

# Mantener solo últimos 30 backups
find "$BACKUP_DIR" -name "confirmacion_*.tar.gz" -mtime +30 -delete
```

### Archivos críticos a respaldar
- `./data/content/` - Todo el contenido de sesiones
- `./data/logs/audit.log` - Historial de cambios
- `.env` - Configuración (sin exponer contraseñas)

## 🛠️ Mantenimiento

### Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f web

# Reiniciar solo el servicio web
docker compose restart web

# Actualizar la aplicación
git pull
docker compose build --no-cache web
docker compose up -d

# Limpiar contenedores antiguos
docker system prune -f
```

### Monitoreo

- **Health check:** `http://192.168.1.100:8080/api/health`
- **Logs de aplicación:** `docker compose logs web`
- **Logs de Gotenberg:** `docker compose logs gotenberg`

## 🔧 Solución de Problemas

### Error de conectividad Docker Hub
Si aparece error "failed to resolve source metadata for docker.io/library/node:18":

**Opción 1: Usar proxy/VPN**
```bash
# Configurar proxy Docker si es necesario
docker build --build-arg HTTP_PROXY=http://proxy:port .
```

**Opción 2: Usar imagen local**
```bash
# Descargar imagen manualmente cuando haya conectividad
docker pull node:18
# Luego construir normalmente
docker compose build
```

**Opción 3: Ejecutar sin Docker**
```bash
cd web
npm install
npm run build
npm start
```

### La aplicación no inicia
1. Verificar que los puertos 8080 y 3001 están libres
2. Revisar logs: `docker compose logs web`
3. Verificar permisos en `./data/`

### Error de autenticación
1. Verificar `ADMIN_PASSWORD` en `.env`
2. Limpiar cookies del navegador
3. Reiniciar el contenedor web

### Sesiones no aparecen
1. Verificar `VISIBILITY_MODE` en `.env`
2. Comprobar que las sesiones están publicadas (si `VISIBILITY_MODE=publish`)
3. Verificar que las sesiones han sido editadas (si `VISIBILITY_MODE=edited`)

### Error en generación de PDF
1. Verificar que Gotenberg está funcionando: `docker compose ps`
2. Revisar logs: `docker compose logs gotenberg`
3. Verificar `GOTENBERG_URL` en `.env`

## 📝 Notas de Desarrollo

- **Puerto de desarrollo:** 3000
- **Puerto de producción:** 8080 (mapeado desde 3000 interno)
- **Base de datos:** Sistema de archivos (markdown + YAML)
- **Autenticación:** JWT con contraseña única de admin
- **PDF:** Generación via Gotenberg (Chromium headless)

---

**Versión:** 1.0.0  
**Última actualización:** $(date +%Y-%m-%d)