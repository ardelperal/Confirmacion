# Sistema de Catequesis para Confirmación

[![CI & Security](https://github.com/${{github.repository}}/actions/workflows/ci-security.yml/badge.svg)](../../actions/workflows/ci-security.yml)

Sistema web profesional para gestión de sesiones de catequesis dirigidas a jóvenes de 12-13 años en preparación para el sacramento de la Confirmación.

## 📋 Tabla de Contenidos

- [🚀 Inicio Rápido](#-inicio-rápido)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [🔧 Instalación y Configuración](#-instalación-y-configuración)
- [📚 Recursos de Catequesis](#-recursos-de-catequesis)
- [🛠️ Scripts y Herramientas](#️-scripts-y-herramientas)
- [🔒 Seguridad y Backup](#-seguridad-y-backup)
- [📖 Documentación](#-documentación)
- [🐛 Solución de Problemas](#-solución-de-problemas)

## 🚀 Inicio Rápido

### Requisitos Previos
- Docker y Docker Compose
- Node.js 18+ (para desarrollo local)
- Git con submódulos habilitados

### Despliegue Rápido
```bash
git clone --recurse-submodules <repository-url>
cd Confirmacion
cp web/.env.sample .env
# Editar .env con tus configuraciones
docker compose up -d
```

Accede a la aplicación en `http://localhost:8080`

## 🚀 Despliegue en NAS Synology (DSM 7.1)

### Requisitos
- Synology NAS con DSM 7.1 o superior
- Container Manager instalado desde Package Center
- Acceso SSH habilitado
- Puertos 8080 y 3001 disponibles

### Preparación del NAS

1. **Habilitar SSH:**
   - Panel de Control → Terminal y SNMP → Habilitar servicio SSH
   - Conectar: `ssh admin@IP_DEL_NAS`

2. **Instalar Container Manager:**
   - Package Center → Buscar "Container Manager" → Instalar
   - Verificar que Docker está funcionando: `docker --version`

3. **Crear estructura de directorios:**
   ```bash
   # Conectar por SSH al NAS
   ssh admin@192.168.1.100
   
   # Crear directorio del proyecto
   sudo mkdir -p /volume1/docker/catequesis
   cd /volume1/docker/catequesis
   ```

### Configuración inicial

1. **Clonar el repositorio:**
   ```bash
   # En el NAS
   sudo git clone <repository-url> .
   sudo chown -R admin:users .
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp web/.env.example .env
   nano .env
   ```
   
   Configuración específica para Synology:
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

3. **Preparar directorios de datos:**
   ```bash
   # Crear directorios con permisos correctos
   sudo mkdir -p data/content data/auth data/logs
   sudo chown -R 1001:1001 data/
   sudo chmod -R 755 data/
   
   # Copiar contenido inicial
   cp -r web/content/* data/content/
   sudo chown -R 1001:1001 data/content/
   ```

### Despliegue

1. **Construir y ejecutar:**
   ```bash
   # Construir las imágenes
   sudo docker compose build
   
   # Ejecutar en segundo plano
   sudo docker compose up -d
   ```

2. **Verificar estado:**
   ```bash
   # Verificar contenedores
   sudo docker compose ps
   
   # Ver logs si hay problemas
   sudo docker compose logs web
   sudo docker compose logs gotenberg
   ```

3. **Configurar inicio automático:**
   - Container Manager → Contenedor → Configuración → Habilitar auto-restart

### 🔄 Configuración de Backups en Synology

Los volúmenes Docker que contienen datos modificables son:
- `./data/content` - Sesiones de catequesis y configuración
- `./data/auth` - Datos de autenticación
- `./data/logs` - Logs de auditoría

#### Backup Automático con Hyper Backup

1. **Configurar Hyper Backup:**
   - Package Center → Instalar "Hyper Backup"
   - Crear nueva tarea de backup
   - Seleccionar destino (USB, red, nube)

2. **Configurar carpetas a respaldar:**
   ```
   Origen: /volume1/docker/catequesis/data/
   Incluir:
   ├── content/     (sesiones y configuración)
   ├── auth/        (datos de autenticación)
   └── logs/        (logs de auditoría)
   
   Excluir:
   ├── .env         (contiene secretos)
   └── node_modules/
   ```

3. **Programación recomendada:**
   - Frecuencia: Diaria a las 2:00 AM
   - Retención: 30 versiones
   - Compresión: Habilitada
   - Cifrado: Habilitado con contraseña fuerte

#### Backup Manual por SSH

```bash
# Script de backup manual
#!/bin/bash
BACKUP_DIR="/volume1/backups/catequesis"
DATE=$(date +%Y%m%d_%H%M%S)
SOURCE_DIR="/volume1/docker/catequesis/data"

# Crear directorio de backup
mkdir -p "$BACKUP_DIR"

# Backup con rsync (preserva permisos y enlaces)
rsync -av --exclude='.env' \
    "$SOURCE_DIR/" \
    "$BACKUP_DIR/backup_$DATE/"

# Comprimir backup
tar -czf "$BACKUP_DIR/catequesis_$DATE.tar.gz" \
    -C "$BACKUP_DIR" "backup_$DATE"

# Limpiar directorio temporal
rm -rf "$BACKUP_DIR/backup_$DATE"

# Mantener solo los últimos 10 backups
ls -t "$BACKUP_DIR"/*.tar.gz | tail -n +11 | xargs rm -f

echo "Backup completado: catequesis_$DATE.tar.gz"
```

#### Programar Backup con Cron

```bash
# Editar crontab del usuario admin
crontab -e

# Añadir línea para backup diario a las 2:00 AM
0 2 * * * /volume1/docker/catequesis/scripts/backup/synology-backup.sh

# Verificar crontab
crontab -l
```

#### Restauración de Backup

```bash
# Parar contenedores
sudo docker compose down

# Restaurar desde backup
cd /volume1/docker/catequesis
tar -xzf /volume1/backups/catequesis/catequesis_YYYYMMDD_HHMMSS.tar.gz

# Restaurar permisos
sudo chown -R 1001:1001 data/
sudo chmod -R 755 data/

# Reiniciar contenedores
sudo docker compose up -d
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
├── 📁 docs/                    # Documentación técnica
│   ├── deployment/            # Guías de despliegue
│   ├── security/              # Documentación de seguridad
│   └── technical/             # Documentación técnica
├── 📁 external/               # Submódulos externos
│   └── catequesis/           # Contenido de catequesis
├── 📁 scripts/               # Scripts de automatización
│   ├── backup/               # Scripts de respaldo
│   ├── export/               # Scripts de exportación
│   ├── setup/                # Scripts de configuración
│   └── verification/         # Scripts de verificación
├── 📁 web/                   # Aplicación Next.js
│   ├── app/                  # Rutas y páginas
│   ├── components/           # Componentes React
│   ├── lib/                  # Utilidades y configuración
│   └── public/               # Archivos estáticos
├── 📁 data/                  # Datos de la aplicación
│   ├── content/              # Contenido de sesiones
│   └── logs/                 # Logs del sistema
├── docker-compose.yml        # Configuración Docker
├── Dockerfile               # Imagen de la aplicación
└── .env                     # Variables de entorno
```

## 🔧 Instalación y Configuración

### Configuración Detallada

Para una configuración completa del sistema, consulta:
- 📖 [Guía de Despliegue en NAS](docs/deployment/DESPLIEGUE_NAS.md)
- 🐳 [Configuración Docker](docs/deployment/README_DOCKER.md)
- 🔒 [Configuración de Seguridad](docs/security/SECURITY-GOTENBERG.md)

## 📁 Estructura de Datos

```
data/
├── content/
│   ├── sessions/          # Archivos .md de sesiones
│   └── modules.yml        # Configuración de módulos
└── logs/
    └── audit.log          # Log de auditoría
```

## 📚 Recursos de Catequesis

### Estructura del Sistema
El contenido de catequesis se gestiona como un **submódulo Git** independiente:
- **Fuente**: `external/catequesis/` (submódulo Git)
- **Destino**: `web/public/recursos/catequesis/` (copia sincronizada)
- **Rutas públicas**: 
  - `/recursos` - Página principal de recursos
  - `/recursos/catequesis` - Índice general de catequesis
  - `/recursos/catequesis/indice_general.html` - Listado completo
  - `/recursos/catequesis/fichas/<personaje>.html` - Fichas individuales

### Comandos de Sincronización

#### Primera vez (configuración inicial)
```powershell
# Clonar el submódulo de catequesis
git submodule update --init --recursive

# Sincronizar contenido a la web
npm run sync:catequesis
```

#### Actualizar contenido existente
```powershell
# Opción 1: Comando directo (recomendado)
npm run sync:catequesis

# Opción 2: Actualizar submódulo y sincronizar
git submodule update --remote external/catequesis
npm run sync:catequesis
```

### Despliegue Automático
El sistema de **CI/CD** se encarga automáticamente de:
1. **Clonar submódulos**: `git submodule update --init --recursive`
2. **Sincronizar recursos**: Ejecuta `sync-catequesis.mjs` antes del build
3. **Construir aplicación**: `next build` con recursos actualizados

Ver configuración en `.github/workflows/ci-security.yml` y `Dockerfile`.

### Desarrollo Local
Para trabajar con los recursos de catequesis:
```powershell
# 1. Sincronizar contenido
npm run sync:catequesis

# 2. Iniciar servidor de desarrollo
cd web
npm run dev

# 3. Verificar recursos en: http://localhost:3000/recursos/catequesis
```

**Criterio de éxito**: Cualquier desarrollador puede actualizar el contenido con **1 comando** (`npm run sync:catequesis`) y ver los cambios inmediatamente en el servidor local.

## 🛠️ Scripts y Herramientas

El proyecto incluye varios scripts organizados por funcionalidad:

### 📤 Scripts de Exportación
- **[export-all-sessions-pdf.ps1](scripts/export/README.md)** - Exporta todas las sesiones a PDF automáticamente

### ⚙️ Scripts de Configuración
- **setup-catequesis.ps1** - Configuración inicial del sistema de catequesis
- **sync-catequesis.mjs** - Sincronización de contenido de catequesis

### ✅ Scripts de Verificación
- **verify-setup.ps1** - Verificación del sistema en Windows
- **verify-setup.sh** - Verificación del sistema en Linux/macOS

### 💾 Scripts de Backup
- Consulta la [documentación de backup](docs/technical/BACKUP_SISTEMA.md) para scripts de respaldo

## 🔒 Seguridad y Backup

### Sistema de Backup Automático
```powershell
# Crear backup completo
.\scripts\backup\backup.ps1 -Compress

# Restaurar desde backup
.\scripts\backup\restore.ps1 -BackupPath "./backups/backup.zip"
```

### Documentación de Seguridad
- 🔐 [Configuración de Seguridad](docs/security/SECURITY-GOTENBERG.md)
- 🔑 [Recuperación de Contraseña](docs/security/RECUPERACION_CONTRASEÑA.md)
- 💾 [Sistema de Backup Seguro](docs/technical/BACKUP_SEGURO.md)

## 📖 Documentación

### Documentación Técnica
- 🔧 [Actualización de Dependencias](docs/technical/ACTUALIZACIONES_DEPENDENCIAS.md)
- 🤖 [Configuración de Agentes](docs/technical/AGENTS.md)
- 💾 [Sistema de Backup](docs/technical/BACKUP_SISTEMA.md)

### Documentación de Despliegue
- 🏠 [Despliegue en NAS](docs/deployment/DESPLIEGUE_NAS.md)
- 🐳 [Configuración Docker](docs/deployment/README_DOCKER.md)

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

## 🐛 Solución de Problemas

### Problemas Comunes

#### Error de conectividad Docker Hub
```bash
# Usar proxy/VPN si es necesario
docker build --build-arg HTTP_PROXY=http://proxy:port .

# O descargar imagen manualmente
docker pull node:18
docker compose build
```

#### La aplicación no inicia
1. Verificar puertos 8080 y 3001 libres
2. Revisar logs: `docker compose logs web`
3. Verificar permisos en `./data/`

#### Error de autenticación
1. Verificar `ADMIN_PASSWORD` en `.env`
2. Limpiar cookies del navegador
3. Reiniciar contenedor: `docker compose restart web`

### Comandos de Diagnóstico
```bash
# Ver logs en tiempo real
docker compose logs -f web

# Estado de servicios
docker compose ps

# Health check
curl http://localhost:8080/api/health
```

---

**Versión:** 2.0.0  
**Última actualización:** 2025-01-25  
**Mantenido por:** Equipo de Desarrollo