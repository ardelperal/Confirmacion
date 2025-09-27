# Despliegue Docker para NAS

🐳 **Configuración completa para ejecutar la aplicación de Catequesis en NAS con Docker**

## 🚀 Inicio Rápido

### 1. Verificación Previa

```bash
# Linux/macOS
./scripts/verify-setup.sh

# Windows/PowerShell
.\scripts\verify-setup.ps1
```

### 2. Configuración

```bash
# Editar variables de entorno
nano .env
```

**⚠️ OBLIGATORIO cambiar:**
- `ADMIN_PASSWORD`: Contraseña fuerte para el administrador
- `BASE_URL`: Cambiar `<IP_NAS>` por la IP real del NAS
- `JWT_SECRET`: Clave única y segura

### 3. Despliegue

```bash
# Construir y ejecutar
docker compose build
docker compose up -d

# Verificar estado
docker compose ps
```

### 4. Acceso

- **Aplicación:** `http://<IP_NAS>:8080/`
- **Admin:** `http://<IP_NAS>:8080/login`
- **Gotenberg:** `http://<IP_NAS>:3001/` (interno)

## 📋 Servicios Incluidos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **web** | 8080:3000 | Aplicación Next.js |
| **gotenberg** | 3001:3000 | Generador de PDF |

## 🔧 Configuración de Producción

### Dockerfile Multi-stage
- ✅ Optimizado para producción
- ✅ Usuario no-root (UID 1001)
- ✅ Imagen mínima Alpine
- ✅ Build standalone de Next.js

### Docker Compose
- ✅ Servicios web + gotenberg
- ✅ Volúmenes persistentes
- ✅ Red interna
- ✅ Restart automático
- ✅ Health checks

### Variables de Entorno
- ✅ Configuración para NAS
- ✅ Modo producción
- ✅ Integración Gotenberg
- ✅ Seguridad JWT

## 📁 Estructura de Volúmenes

```
./data/content/     → /app/content (contenedor)
├── modules.yml     # Configuración de módulos
├── sessions/       # Archivos de sesiones (.md)
└── .audit.log      # Log de auditoría

./data/auth/        → /app/data (contenedor)
└── parish-auth.json # Configuración de contraseña del párroco
```

## 🔐 Seguridad

### Permisos
```bash
# Configurar permisos correctos
sudo chown -R 1001:1001 ./data/content
sudo chmod -R 755 ./data/content
```

### Contraseñas
- Usar generador de contraseñas para `ADMIN_PASSWORD`
- JWT_SECRET mínimo 32 caracteres
- Cambiar valores por defecto

## 🔄 Operación

### Modo Normal
```env
READ_ONLY=false  # Permite edición
```
- Admin puede crear/editar sesiones
- Sesiones "draft" solo visibles para admin
- Sesiones "published" visibles públicamente

### Modo Solo Lectura
```env
READ_ONLY=true   # Temporadas cerradas
```
- Oculta `/admin` y `/login`
- Bloquea edición
- Mantiene contenido público visible

### Actualizaciones
```bash
git pull
docker compose build --no-cache
docker compose up -d
```

## 💾 Backups

### Sistema de Backup Automatizado

El sistema incluye scripts PowerShell para backup y restauración completos:

#### Crear Backup
```powershell
# Backup básico
.\backup.ps1

# Backup comprimido
.\backup.ps1 -Compress

# Backup en ubicación específica
.\backup.ps1 -BackupPath "C:\Backups\Catequesis"
```

#### Restaurar Backup
```powershell
# Restaurar desde directorio
.\restore.ps1 -BackupPath "./backups/catequesis_backup_20241214_143022"

# Restaurar desde ZIP
.\restore.ps1 -BackupPath "./backups/catequesis_backup_20241214_143022.zip"

# Restaurar sin confirmación
.\restore.ps1 -BackupPath "./backups/backup.zip" -Force
```

### Datos Incluidos en Backup
- **data/content/**: Sesiones y módulos de catequesis
- **data/auth/**: Configuración de contraseña del párroco
- **.env**: Variables de entorno (opcional)

### Backup Automático (Cron/Tarea Programada)
```powershell
# Windows - Tarea programada diaria
schtasks /create /tn "Backup Catequesis" /tr "powershell.exe -File C:\path\to\backup.ps1 -Compress" /sc daily /st 02:00
```

```bash
# Linux - Cron diario
0 2 * * * cd /path/to/catequesis && ./backup.ps1 -Compress
```

## 🔍 Verificación (QA)

### Test Básico
```bash
# 1. Sesión draft no visible públicamente
curl http://<IP_NAS>:8080/ | grep -q "B1" || echo "✓ Draft oculto"

# 2. PDF funciona
curl -I http://<IP_NAS>:8080/api/export/pdf/a1 | grep -q "200 OK" && echo "✓ PDF OK"

# 3. DOCX funciona
curl -I http://<IP_NAS>:8080/api/export/docx/a1 | grep -q "200 OK" && echo "✓ DOCX OK"
```

### Test Completo
1. **Sin login:** Sesiones draft no aparecen
2. **Admin:** Puede crear/editar/publicar
3. **Público:** Solo ve sesiones published
4. **PDF:** Respeta `---pagebreak---`
5. **Fallback:** Si Gotenberg falla, DOCX sigue funcionando

## 🆘 Resolución de Problemas

### Logs
```bash
# Ver logs en tiempo real
docker compose logs -f web
docker compose logs -f gotenberg

# Buscar errores
docker compose logs web | grep ERROR
```

### Problemas Comunes

**Permisos:**
```bash
sudo chown -R 1001:1001 ./data/content
docker compose restart web
```

**Gotenberg caído:**
```bash
docker compose restart gotenberg
# DOCX sigue funcionando, PDF devuelve 503
```

**Puerto ocupado:**
```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "8081:3000"  # En lugar de 8080
```

## 📚 Documentación Completa

- **[DESPLIEGUE_NAS.md](./DESPLIEGUE_NAS.md)** - Guía detallada
- **[README.md](./README.md)** - Documentación general
- **Scripts:** `./scripts/verify-setup.*`

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌──────────────────┐
│   NAS:8080      │    │   Gotenberg     │
│   (Next.js)     │◄──►│   :3001         │
│                 │    │   (PDF gen)     │
└─────────┬───────┘    └──────────────────┘
          │
          ▼
┌─────────────────┐
│  ./data/content │
│  (Persistent)   │
│  - sessions/    │
│  - modules.yml  │
│  - .audit.log   │
└─────────────────┘
```

---

**✅ Listo para producción en NAS**

Para soporte técnico, revisar logs y consultar documentación detallada.