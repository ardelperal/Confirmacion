# Script de Restauración para Sistema de Catequesis
# Restaura una copia de seguridad de los datos del párroco

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    [switch]$Force = $false
)

# Verificar que el backup existe
if (-not (Test-Path $BackupPath)) {
    Write-Host "❌ Error: No se encontró el backup en: $BackupPath" -ForegroundColor Red
    exit 1
}

# Determinar si es un archivo ZIP o directorio
$isZip = $BackupPath.EndsWith(".zip")
if ($isZip) {
    $tempDir = "./temp_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host "Extrayendo backup ZIP..." -ForegroundColor Yellow
    Expand-Archive -Path $BackupPath -DestinationPath $tempDir -Force
    $BackupPath = Get-ChildItem $tempDir | Select-Object -First 1 | Select-Object -ExpandProperty FullName
}

# Verificar estructura del backup
$contentPath = Join-Path $BackupPath "content"
$authPath = Join-Path $BackupPath "auth"
$envPath = Join-Path $BackupPath ".env"
$infoPath = Join-Path $BackupPath "BACKUP_INFO.txt"

if (-not (Test-Path $contentPath) -and -not (Test-Path $authPath)) {
    Write-Host "❌ Error: El backup no contiene la estructura esperada" -ForegroundColor Red
    if ($isZip) { Remove-Item $tempDir -Recurse -Force }
    exit 1
}

# Mostrar información del backup si existe
if (Test-Path $infoPath) {
    Write-Host "`n=== INFORMACIÓN DEL BACKUP ===" -ForegroundColor Cyan
    Get-Content $infoPath | Select-Object -First 10 | ForEach-Object { Write-Host $_ -ForegroundColor White }
    Write-Host "" 
}

# Confirmar restauración
if (-not $Force) {
    $confirm = Read-Host "¿Desea continuar con la restauración? Esto sobrescribirá los datos actuales (s/N)"
    if ($confirm -ne "s" -and $confirm -ne "S" -and $confirm -ne "si" -and $confirm -ne "SI") {
        Write-Host "Restauración cancelada" -ForegroundColor Yellow
        if ($isZip) { Remove-Item $tempDir -Recurse -Force }
        exit 0
    }
}

# Verificar si Docker está corriendo
$dockerRunning = docker-compose ps -q 2>$null
if ($dockerRunning) {
    Write-Host "Deteniendo servicios Docker..." -ForegroundColor Yellow
    docker-compose down
    Start-Sleep -Seconds 3
}

# Función para restaurar con verificación
function Restore-WithVerification {
    param($Source, $Destination, $Description)
    
    if (Test-Path $Source) {
        Write-Host "Restaurando $Description..." -ForegroundColor Yellow
        
        # Crear directorio de destino si no existe
        $destDir = Split-Path $Destination -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        # Hacer backup del archivo actual si existe
        if (Test-Path $Destination) {
            $backupCurrent = "$Destination.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
            Move-Item $Destination $backupCurrent
            Write-Host "  → Backup actual guardado en: $backupCurrent" -ForegroundColor Gray
        }
        
        # Restaurar
        Copy-Item -Path $Source -Destination $Destination -Recurse -Force
        Write-Host "✓ $Description restaurado" -ForegroundColor Green
    } else {
        Write-Host "⚠ $Description no encontrado en backup" -ForegroundColor Orange
    }
}

# Restaurar contenido
Restore-WithVerification $contentPath "./data/content" "Contenido de sesiones"

# Restaurar autenticación
Restore-WithVerification $authPath "./data/auth" "Configuración de autenticación"

# Restaurar configuración del entorno (opcional)
if (Test-Path $envPath) {
    $restoreEnv = Read-Host "¿Desea restaurar también el archivo .env? (s/N)"
    if ($restoreEnv -eq "s" -or $restoreEnv -eq "S") {
        Restore-WithVerification $envPath "./.env" "Configuración del entorno"
    }
}

# Limpiar archivos temporales
if ($isZip -and (Test-Path $tempDir)) {
    Remove-Item $tempDir -Recurse -Force
}

# Configurar permisos (si estamos en un entorno que lo soporte)
Write-Host "Configurando permisos..." -ForegroundColor Yellow
try {
    # En Windows, esto puede no ser necesario, pero lo intentamos
    icacls "./data" /grant Everyone:F /T 2>$null | Out-Null
    Write-Host "✓ Permisos configurados" -ForegroundColor Green
} catch {
    Write-Host "⚠ No se pudieron configurar permisos automáticamente" -ForegroundColor Orange
}

# Reiniciar servicios
Write-Host "Reiniciando servicios Docker..." -ForegroundColor Yellow
docker-compose up -d

# Esperar a que los servicios estén listos
Write-Host "Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar estado
$services = docker-compose ps --format json | ConvertFrom-Json
$allRunning = $true
foreach ($service in $services) {
    if ($service.State -ne "running") {
        $allRunning = $false
        break
    }
}

if ($allRunning) {
    Write-Host "✅ Restauración completada exitosamente" -ForegroundColor Green
    Write-Host "Los servicios están corriendo en:" -ForegroundColor White
    Write-Host "  - Aplicación: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "  - Admin: http://localhost:3001/admin" -ForegroundColor Cyan
} else {
    Write-Host "⚠ Restauración completada pero algunos servicios pueden no estar corriendo" -ForegroundColor Orange
    Write-Host "Ejecute 'docker-compose logs' para ver detalles" -ForegroundColor Yellow
}

Write-Host "`nPara verificar que todo funciona correctamente:" -ForegroundColor Yellow
Write-Host "1. Abra http://localhost:3001 en su navegador" -ForegroundColor White
Write-Host "2. Verifique que las sesiones se muestran correctamente" -ForegroundColor White
Write-Host "3. Pruebe el acceso de administrador en /admin" -ForegroundColor White