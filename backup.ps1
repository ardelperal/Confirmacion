# Script de Backup para Sistema de Catequesis
# Crea una copia de seguridad de todos los datos modificables por el párroco

param(
    [string]$BackupPath = "./backups",
    [switch]$Compress = $false
)

# Configuración
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "catequesis_backup_$timestamp"
$fullBackupPath = Join-Path $BackupPath $backupName

# Crear directorio de backup
Write-Host "Creando backup en: $fullBackupPath" -ForegroundColor Green
New-Item -ItemType Directory -Path $fullBackupPath -Force | Out-Null

# Función para copiar con verificación
function Copy-WithVerification {
    param($Source, $Destination, $Description)
    
    if (Test-Path $Source) {
        Write-Host "Copiando $Description..." -ForegroundColor Yellow
        Copy-Item -Path $Source -Destination $Destination -Recurse -Force
        Write-Host "✓ $Description copiado" -ForegroundColor Green
    } else {
        Write-Host "⚠ $Description no encontrado en: $Source" -ForegroundColor Orange
    }
}

# Backup de contenido de sesiones (modificable por párroco)
Copy-WithVerification "./data/content" "$fullBackupPath/content" "Contenido de sesiones"

# Backup de autenticación del párroco
Copy-WithVerification "./data/auth" "$fullBackupPath/auth" "Configuración de autenticación"

# Backup de configuración del entorno (solo si existe)
if (Test-Path "./.env") {
    Copy-WithVerification "./.env" "$fullBackupPath/.env" "Configuración del entorno"
}

# Crear archivo de información del backup
$backupInfo = @"
BACKUP INFORMACIÓN
==================
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Sistema: Catequesis para Confirmación
Tipo: Datos modificables por párroco

CONTENIDO DEL BACKUP:
- data/content/     → Sesiones y módulos de catequesis
- data/auth/        → Configuración de contraseña del párroco
- .env              → Variables de entorno (si existe)

RESTAURACIÓN:
1. Detener Docker: docker-compose down
2. Restaurar archivos: copiar contenido a las carpetas originales
3. Verificar permisos: chown -R 1001:1001 ./data/
4. Reiniciar: docker-compose up -d

NOTAS:
- Este backup NO incluye la contraseña maestra del desarrollador
- Para recuperación completa, consultar RECUPERACION_CONTRASEÑA.md
"@

$backupInfo | Out-File -FilePath "$fullBackupPath/BACKUP_INFO.txt" -Encoding UTF8

# Comprimir si se solicita
if ($Compress) {
    Write-Host "Comprimiendo backup..." -ForegroundColor Yellow
    $zipPath = "$BackupPath/$backupName.zip"
    Compress-Archive -Path $fullBackupPath -DestinationPath $zipPath -Force
    Remove-Item -Path $fullBackupPath -Recurse -Force
    Write-Host "✓ Backup comprimido en: $zipPath" -ForegroundColor Green
} else {
    Write-Host "✓ Backup completado en: $fullBackupPath" -ForegroundColor Green
}

# Mostrar resumen
Write-Host "`n=== RESUMEN DEL BACKUP ===" -ForegroundColor Cyan
Write-Host "Timestamp: $timestamp" -ForegroundColor White
if ($Compress) {
    $size = (Get-Item "$BackupPath/$backupName.zip").Length
    Write-Host "Archivo: $backupName.zip ($([math]::Round($size/1MB, 2)) MB)" -ForegroundColor White
} else {
    Write-Host "Directorio: $backupName" -ForegroundColor White
}
Write-Host "Ubicación: $BackupPath" -ForegroundColor White

Write-Host "`n✅ Backup completado exitosamente" -ForegroundColor Green
Write-Host "Para restaurar, consulte el archivo BACKUP_INFO.txt" -ForegroundColor Yellow