# Sistema de Backup - Catequesis para Confirmación

## 🎯 Propósito

Este sistema de backup está diseñado para proteger **todos los datos que puede modificar el párroco** durante el uso normal del sistema de catequesis.

## 📦 ¿Qué se incluye en el backup?

### Datos del Párroco
- **Sesiones de catequesis** (`data/content/sessions/`)
  - Archivos .md de todas las sesiones (A1-F4)
  - Modificaciones y personalizaciones del contenido

- **Configuración de módulos** (`data/content/modules.yml`)
  - Estructura y configuración de los módulos
  - Duraciones personalizadas

- **Autenticación del párroco** (`data/auth/parish-auth.json`)
  - Contraseña hasheada del párroco
  - Configuración de seguridad

- **Variables de entorno** (`.env` - opcional)
  - Configuración del sistema
  - Solo se incluye si se solicita explícitamente

### ❌ Lo que NO se incluye
- Contraseña maestra del desarrollador (está en `.env` y es independiente)
- Archivos del sistema o código fuente
- Logs del sistema
- Configuración de Docker

## 🚀 Uso Rápido

### Crear Backup
```powershell
# Backup básico en carpeta ./backups/
.\backup.ps1

# Backup comprimido (recomendado para envío)
.\backup.ps1 -Compress
```

### Restaurar Backup
```powershell
# Desde directorio
.\restore.ps1 -BackupPath "./backups/catequesis_backup_20241214_143022"

# Desde archivo ZIP
.\restore.ps1 -BackupPath "./backups/backup.zip"
```

## 📋 Guía Detallada

### 1. Crear Backup Manual

```powershell
# Navegar al directorio del proyecto
cd C:\Proyectos\Confirmacion

# Crear backup básico
.\backup.ps1

# Crear backup comprimido
.\backup.ps1 -Compress

# Especificar ubicación personalizada
.\backup.ps1 -BackupPath "D:\Backups\Catequesis" -Compress
```

**Resultado:**
- Carpeta: `./backups/catequesis_backup_YYYYMMDD_HHMMSS/`
- ZIP: `./backups/catequesis_backup_YYYYMMDD_HHMMSS.zip`
- Info: Archivo `BACKUP_INFO.txt` con detalles

### 2. Programar Backup Automático

#### Windows (Tarea Programada)
```powershell
# Crear tarea que se ejecuta diariamente a las 2:00 AM
schtasks /create /tn "Backup Catequesis" /tr "powershell.exe -ExecutionPolicy Bypass -File C:\Proyectos\Confirmacion\backup.ps1 -Compress" /sc daily /st 02:00

# Verificar tarea creada
schtasks /query /tn "Backup Catequesis"

# Ejecutar tarea manualmente (para probar)
schtasks /run /tn "Backup Catequesis"
```

#### Linux/NAS (Cron)
```bash
# Editar crontab
crontab -e

# Agregar línea para backup diario a las 2:00 AM
0 2 * * * cd /path/to/catequesis && pwsh ./backup.ps1 -Compress
```

### 3. Restaurar desde Backup

```powershell
# Detener servicios (automático)
# Restaurar archivos
.\restore.ps1 -BackupPath "./backups/catequesis_backup_20241214_143022"

# Restaurar sin confirmación (para scripts)
.\restore.ps1 -BackupPath "./backups/backup.zip" -Force
```

**El script de restauración:**
1. ✅ Detiene automáticamente Docker
2. ✅ Hace backup de los archivos actuales
3. ✅ Restaura los archivos del backup
4. ✅ Configura permisos
5. ✅ Reinicia los servicios
6. ✅ Verifica que todo funcione

## 🔧 Casos de Uso Comunes

### Caso 1: Backup antes de cambios importantes
```powershell
# Antes de actualizar el sistema
.\backup.ps1 -Compress
# Guardar el ZIP en lugar seguro
```

### Caso 2: Migrar a otro servidor
```powershell
# En servidor origen
.\backup.ps1 -Compress -BackupPath "D:\Transfer"

# Copiar ZIP al servidor destino
# En servidor destino (después de instalar el sistema)
.\restore.ps1 -BackupPath "./catequesis_backup_YYYYMMDD_HHMMSS.zip" -Force
```

### Caso 3: Recuperación de desastre
```powershell
# Si se perdieron datos
.\restore.ps1 -BackupPath "./backups/ultimo_backup_bueno.zip"
```

### Caso 4: Backup periódico para el párroco
```powershell
# Crear backup semanal para enviar al párroco
.\backup.ps1 -Compress -BackupPath "C:\Users\Parroco\Documents\Backups"
```

## 🛡️ Seguridad y Mejores Prácticas

### ✅ Recomendaciones
1. **Backup regular**: Mínimo semanal, idealmente diario
2. **Múltiples ubicaciones**: Local + nube + dispositivo externo
3. **Verificar backups**: Probar restauración periódicamente
4. **Nombrado claro**: Los scripts usan timestamps automáticos
5. **Compresión**: Usar `-Compress` para ahorrar espacio

### ⚠️ Consideraciones de Seguridad
- Los backups contienen la contraseña hasheada del párroco
- NO contienen la contraseña maestra del desarrollador
- Almacenar backups en ubicaciones seguras
- No enviar backups por email sin cifrar

### 🔍 Verificación de Integridad
Cada backup incluye:
- Timestamp de creación
- Lista de archivos incluidos
- Instrucciones de restauración
- Información del sistema

## 🆘 Solución de Problemas

### Error: "No se puede acceder al archivo"
```powershell
# Verificar que Docker esté detenido
docker-compose down

# Intentar backup nuevamente
.\backup.ps1
```

### Error: "Permisos insuficientes"
```powershell
# Ejecutar PowerShell como Administrador
# O verificar permisos en la carpeta data/
```

### Backup corrupto o incompleto
```powershell
# Verificar espacio en disco
Get-PSDrive C

# Crear backup en otra ubicación
.\backup.ps1 -BackupPath "D:\Temp"
```

### Restauración fallida
```powershell
# Verificar estructura del backup
Get-ChildItem -Recurse "./backups/backup_folder"

# Restaurar manualmente si es necesario
Copy-Item "./backups/backup_folder/content" "./data/content" -Recurse -Force
Copy-Item "./backups/backup_folder/auth" "./data/auth" -Recurse -Force
```

## 📞 Contacto

Para problemas técnicos con el sistema de backup:
1. Revisar logs: `docker-compose logs`
2. Verificar permisos de archivos
3. Consultar esta documentación
4. Contactar al desarrollador con detalles específicos

---

**Última actualización:** $(Get-Date -Format 'yyyy-MM-dd')
**Versión del sistema:** 1.0