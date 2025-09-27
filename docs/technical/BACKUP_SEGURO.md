# Sistema de Backup Seguro - Catequesis para Confirmación

## 🔒 Características de Seguridad

### Exclusión Automática de Secretos
- **Por defecto**: Los archivos `.env` y otros secretos se EXCLUYEN automáticamente
- **Configuración**: Patrones definidos en `backup-exclude.conf`
- **Cifrado opcional**: Posibilidad de incluir secretos cifrados con GPG

### Permisos Seguros
- **Directorio de backups**: Permisos 700 (solo propietario)
- **Archivos de backup**: Permisos 600 (solo propietario)
- **Validación automática**: Verifica y corrige permisos inseguros

## 📦 Uso del Sistema

### Backup Básico (Recomendado)
```powershell
# Backup seguro sin secretos
.\backup.ps1 -Compress
```

### Backup con Secretos Cifrados (Avanzado)
```powershell
# Requiere GPG instalado
.\backup.ps1 -EncryptSecrets -Compress
```

### Backup con Secretos Sin Cifrar (NO RECOMENDADO)
```powershell
# Solo para desarrollo local
.\backup.ps1 -IncludeSecrets -Compress
```

## 🛡️ Configuración de Exclusiones

### Archivo `backup-exclude.conf`
Contiene patrones de archivos a excluir:

```
# Variables de entorno
*.env*
.env

# Claves privadas
*.key
*.pem
*.p12
*.pfx

# Credenciales
*secret*
*password*
*credential*
*token*

# Directorios del sistema
.git/
node_modules/
__pycache__/

# Archivos temporales
*.log
*.tmp
*.backup
```

### Personalización
1. Editar `backup-exclude.conf`
2. Agregar patrones específicos del proyecto
3. Usar `#` para comentarios

## 🔐 Manejo de Secretos

### Opción 1: Exclusión Total (Recomendado)
- Los archivos `.env` no se incluyen en el backup
- Máxima seguridad
- Requiere configuración manual tras restauración

### Opción 2: Cifrado con GPG
```powershell
# Instalar GPG primero
winget install GnuPG.GnuPG

# Crear backup con secretos cifrados
.\backup.ps1 -EncryptSecrets -Compress
```

**Restauración de secretos cifrados:**
```powershell
# Descifrar archivo .env
gpg --decrypt backups/backup_folder/.env.gpg > .env
```

## 📋 Retención y Gestión

### Política de Retención Recomendada
- **Diarios**: 30 días
- **Semanales**: 4 semanas (mantener 1 por semana)
- **Mensuales**: 12 meses (mantener 1 por mes)
- **Anuales**: Indefinido (mantener 1 por año)

### Limpieza Automática

El sistema incluye un script de limpieza automática (`cleanup-backups.ps1`):

```powershell
# Limpieza con configuración por defecto
.\cleanup-backups.ps1

# Simulación (no elimina archivos)
.\cleanup-backups.ps1 -DryRun -Verbose

# Configuración personalizada
.\cleanup-backups.ps1 -KeepDays 45 -KeepWeekly 6 -KeepMonthly 24

# Ver qué se eliminará
.\cleanup-backups.ps1 -DryRun -Verbose
```

**Características del script de limpieza:**
- Mantiene automáticamente backups según política de retención
- Agrupa backups por períodos (diario, semanal, mensual, anual)
- Modo simulación para verificar antes de eliminar
- Reportes detallados de espacio liberado
- Manejo seguro de errores

### Limpieza Manual

```powershell
# Eliminar backups antiguos (más de 30 días)
Get-ChildItem "./backups" -Name "catequesis_backup_*.zip" | 
    Where-Object { 
        $date = [DateTime]::ParseExact($_.Substring(17, 8), "yyyyMMdd", $null)
        $date -lt (Get-Date).AddDays(-30)
    } | 
    ForEach-Object { Remove-Item "./backups/$_" -Force }
```

### Automatización

#### Configuración Automática (Recomendado)

Use el script de configuración incluido:

```powershell
# Ver opciones disponibles
.\setup-backup-schedule.ps1

# Instalar tareas programadas con configuración por defecto
.\setup-backup-schedule.ps1 -Install

# Personalizar horarios
.\setup-backup-schedule.ps1 -Install -BackupTime "01:30" -CleanupDay "Saturday" -CleanupTime "02:00"

# Ver estado de las tareas
.\setup-backup-schedule.ps1 -Status

# Desinstalar tareas
.\setup-backup-schedule.ps1 -Uninstall
```

#### Configuración Manual

**Windows (Programador de Tareas)**
```cmd
schtasks /create /tn "Backup Catequesis Diario" ^
    /tr "powershell.exe -ExecutionPolicy Bypass -File C:\Proyectos\Confirmacion\backup.ps1 -Compress" ^
    /sc daily /st 02:00 /ru SYSTEM
```

**Linux/macOS (Cron)**
```bash
# Backup diario a las 2 AM
0 2 * * * /usr/bin/pwsh /path/to/catequesis/backup.ps1 -Compress
# Limpieza semanal los domingos a las 3 AM
0 3 * * 0 /usr/bin/pwsh /path/to/catequesis/cleanup-backups.ps1
```

## 🔄 Restauración Segura

### Proceso Completo
1. **Detener servicios**:
   ```powershell
   docker-compose down
   ```

2. **Hacer backup de seguridad**:
   ```powershell
   .\backup.ps1 -Compress -BackupPath "./backups/pre-restore"
   ```

3. **Restaurar desde backup**:
   ```powershell
   .\restore.ps1 -BackupPath "./backups/catequesis_backup_YYYYMMDD_HHMMSS.zip"
   ```

4. **Restaurar secretos** (si están cifrados):
   ```powershell
   gpg --decrypt .env.gpg > .env
   ```

5. **Verificar permisos**:
   ```bash
   chown -R 1001:1001 ./data/
   chmod 600 .env
   ```

6. **Reiniciar servicios**:
   ```powershell
   docker-compose up -d
   ```

## ⚠️ Consideraciones de Seguridad

### Almacenamiento de Backups
- **Local**: Solo en discos cifrados
- **Red**: Solo en ubicaciones seguras (NAS con cifrado)
- **Nube**: Solo con cifrado de extremo a extremo
- **Transporte**: Nunca por email sin cifrar

### Verificación de Integridad
```powershell
# Verificar backup antes de usar
.\restore.ps1 -BackupPath "./backups/backup.zip" -TestOnly
```

### Auditoría
- Registrar todas las operaciones de backup/restore
- Verificar permisos periódicamente
- Probar restauración mensualmente

## 🚨 Resolución de Problemas

### Error: "Permisos inseguros detectados"
```powershell
# El script corrige automáticamente, pero si persiste:
chmod 700 ./backups/  # Linux/macOS
# o ajustar permisos en Windows manualmente
```

### Error: "GPG no encontrado"
```powershell
# Instalar GPG
winget install GnuPG.GnuPG
# o usar backup sin cifrado (menos seguro)
.\backup.ps1 -IncludeSecrets -Compress
```

### Backup Corrupto
```powershell
# Verificar integridad
Test-Archive "./backups/backup.zip"

# Crear nuevo backup
.\backup.ps1 -Compress -BackupPath "./backups/emergency"
```

## 📞 Soporte

Para problemas técnicos:
1. Verificar logs en `BACKUP_INFO.txt`
2. Comprobar permisos del directorio
3. Validar configuración de exclusiones
4. Consultar documentación de GPG si usa cifrado

---

**Importante**: Este sistema está diseñado para proteger secretos y credenciales. Siempre verificar que los backups no contengan información sensible antes de almacenarlos o transportarlos.