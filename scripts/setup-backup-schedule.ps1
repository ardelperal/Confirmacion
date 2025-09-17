# Script para configurar tareas programadas de backup
# Configura backup diario y limpieza semanal automática

param(
    [switch]$Install = $false,
    [switch]$Uninstall = $false,
    [switch]$Status = $false,
    [string]$BackupTime = "02:00",  # Hora del backup diario
    [string]$CleanupDay = "Sunday",  # Día de limpieza semanal
    [string]$CleanupTime = "03:00"   # Hora de limpieza
)

# Verificar permisos de administrador
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (!(Test-Administrator)) {
    Write-Host "❌ Este script requiere permisos de administrador" -ForegroundColor Red
    Write-Host "Ejecutar como administrador o usar 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

$scriptPath = $PSScriptRoot
$backupScript = Join-Path $scriptPath "backup.ps1"
$cleanupScript = Join-Path $scriptPath "cleanup-backups.ps1"

# Verificar que los scripts existen
if (!(Test-Path $backupScript)) {
    Write-Host "❌ No se encuentra backup.ps1 en: $backupScript" -ForegroundColor Red
    exit 1
}

if (!(Test-Path $cleanupScript)) {
    Write-Host "❌ No se encuentra cleanup-backups.ps1 en: $cleanupScript" -ForegroundColor Red
    exit 1
}

# Nombres de las tareas
$backupTaskName = "CatequesisBackup-Daily"
$cleanupTaskName = "CatequesisBackup-Cleanup"

function Install-BackupTasks {
    Write-Host "📅 Configurando tareas programadas de backup..." -ForegroundColor Cyan
    
    try {
        # Tarea de backup diario
        $backupAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$backupScript`" -Compress"
        $backupTrigger = New-ScheduledTaskTrigger -Daily -At $BackupTime
        $backupSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        $backupPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        
        Register-ScheduledTask -TaskName $backupTaskName -Action $backupAction -Trigger $backupTrigger -Settings $backupSettings -Principal $backupPrincipal -Description "Backup diario automático del sistema de catequesis" -Force
        
        Write-Host "✅ Tarea de backup diario configurada: $BackupTime" -ForegroundColor Green
        
        # Tarea de limpieza semanal
        $cleanupAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$cleanupScript`" -KeepDays 30 -KeepWeekly 4 -KeepMonthly 12"
        $cleanupTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $CleanupDay -At $CleanupTime
        $cleanupSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        $cleanupPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        
        Register-ScheduledTask -TaskName $cleanupTaskName -Action $cleanupAction -Trigger $cleanupTrigger -Settings $cleanupSettings -Principal $cleanupPrincipal -Description "Limpieza semanal de backups antiguos del sistema de catequesis" -Force
        
        Write-Host "✅ Tarea de limpieza semanal configurada: $CleanupDay a las $CleanupTime" -ForegroundColor Green
        
        Write-Host "" 
        Write-Host "📋 CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
        Write-Host "• Backup diario: todos los días a las $BackupTime" -ForegroundColor White
        Write-Host "• Limpieza: cada $CleanupDay a las $CleanupTime" -ForegroundColor White
        Write-Host "• Retención: 30 días diarios, 4 semanales, 12 mensuales" -ForegroundColor White
        Write-Host "" 
        Write-Host "Para verificar el estado: ./setup-backup-schedule.ps1 -Status" -ForegroundColor Yellow
        
    } catch {
        Write-Host "❌ Error configurando tareas: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

function Uninstall-BackupTasks {
    Write-Host "🗑️ Eliminando tareas programadas de backup..." -ForegroundColor Yellow
    
    try {
        # Eliminar tarea de backup
        if (Get-ScheduledTask -TaskName $backupTaskName -ErrorAction SilentlyContinue) {
            Unregister-ScheduledTask -TaskName $backupTaskName -Confirm:$false
            Write-Host "✅ Tarea de backup eliminada" -ForegroundColor Green
        } else {
            Write-Host "ℹ️ Tarea de backup no encontrada" -ForegroundColor Gray
        }
        
        # Eliminar tarea de limpieza
        if (Get-ScheduledTask -TaskName $cleanupTaskName -ErrorAction SilentlyContinue) {
            Unregister-ScheduledTask -TaskName $cleanupTaskName -Confirm:$false
            Write-Host "✅ Tarea de limpieza eliminada" -ForegroundColor Green
        } else {
            Write-Host "ℹ️ Tarea de limpieza no encontrada" -ForegroundColor Gray
        }
        
        Write-Host "" 
        Write-Host "✅ Tareas programadas eliminadas correctamente" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Error eliminando tareas: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

function Show-TaskStatus {
    Write-Host "📊 ESTADO DE TAREAS PROGRAMADAS" -ForegroundColor Cyan
    Write-Host "" 
    
    # Estado de backup diario
    $backupTask = Get-ScheduledTask -TaskName $backupTaskName -ErrorAction SilentlyContinue
    if ($backupTask) {
        $backupInfo = Get-ScheduledTaskInfo -TaskName $backupTaskName
        Write-Host "🔄 Backup Diario ($backupTaskName):" -ForegroundColor Green
        Write-Host "   Estado: $($backupTask.State)" -ForegroundColor White
        Write-Host "   Última ejecución: $($backupInfo.LastRunTime)" -ForegroundColor White
        Write-Host "   Resultado: $($backupInfo.LastTaskResult)" -ForegroundColor White
        Write-Host "   Próxima ejecución: $($backupInfo.NextRunTime)" -ForegroundColor White
    } else {
        Write-Host "❌ Backup Diario: No configurado" -ForegroundColor Red
    }
    
    Write-Host "" 
    
    # Estado de limpieza semanal
    $cleanupTask = Get-ScheduledTask -TaskName $cleanupTaskName -ErrorAction SilentlyContinue
    if ($cleanupTask) {
        $cleanupInfo = Get-ScheduledTaskInfo -TaskName $cleanupTaskName
        Write-Host "🧹 Limpieza Semanal ($cleanupTaskName):" -ForegroundColor Green
        Write-Host "   Estado: $($cleanupTask.State)" -ForegroundColor White
        Write-Host "   Última ejecución: $($cleanupInfo.LastRunTime)" -ForegroundColor White
        Write-Host "   Resultado: $($cleanupInfo.LastTaskResult)" -ForegroundColor White
        Write-Host "   Próxima ejecución: $($cleanupInfo.NextRunTime)" -ForegroundColor White
    } else {
        Write-Host "❌ Limpieza Semanal: No configurada" -ForegroundColor Red
    }
    
    Write-Host "" 
    
    # Estadísticas de backups
    $backupPath = Join-Path $scriptPath "backups"
    if (Test-Path $backupPath) {
        $backups = Get-ChildItem $backupPath -Name "catequesis_backup_*.zip" -ErrorAction SilentlyContinue
        if ($backups) {
            $totalSize = (Get-ChildItem $backupPath -Name "catequesis_backup_*.zip" | ForEach-Object { (Get-Item (Join-Path $backupPath $_)).Length } | Measure-Object -Sum).Sum
            $sizeGB = [math]::Round($totalSize / 1GB, 2)
            Write-Host "📁 Estadísticas de Backups:" -ForegroundColor Cyan
            Write-Host "   Archivos: $($backups.Count)" -ForegroundColor White
            Write-Host "   Tamaño total: $sizeGB GB" -ForegroundColor White
            
            $newest = $backups | Sort-Object | Select-Object -Last 1
            $oldest = $backups | Sort-Object | Select-Object -First 1
            Write-Host "   Más reciente: $newest" -ForegroundColor White
            Write-Host "   Más antiguo: $oldest" -ForegroundColor White
        } else {
            Write-Host "📁 No hay backups disponibles" -ForegroundColor Yellow
        }
    } else {
        Write-Host "📁 Directorio de backups no existe" -ForegroundColor Yellow
    }
}

# Mostrar ayuda si no se especifican parámetros
if (!$Install -and !$Uninstall -and !$Status) {
    Write-Host "" 
    Write-Host "🔧 CONFIGURADOR DE TAREAS DE BACKUP" -ForegroundColor Cyan
    Write-Host "" 
    Write-Host "Uso:" -ForegroundColor White
    Write-Host "  ./setup-backup-schedule.ps1 -Install          # Instalar tareas programadas" -ForegroundColor Gray
    Write-Host "  ./setup-backup-schedule.ps1 -Uninstall       # Eliminar tareas programadas" -ForegroundColor Gray
    Write-Host "  ./setup-backup-schedule.ps1 -Status          # Ver estado de las tareas" -ForegroundColor Gray
    Write-Host "" 
    Write-Host "Opciones de instalación:" -ForegroundColor White
    Write-Host "  -BackupTime '02:00'     # Hora del backup diario (por defecto: 02:00)" -ForegroundColor Gray
    Write-Host "  -CleanupDay 'Sunday'    # Día de limpieza (por defecto: Sunday)" -ForegroundColor Gray
    Write-Host "  -CleanupTime '03:00'    # Hora de limpieza (por defecto: 03:00)" -ForegroundColor Gray
    Write-Host "" 
    Write-Host "Ejemplo:" -ForegroundColor White
    Write-Host "  ./setup-backup-schedule.ps1 -Install -BackupTime '01:30' -CleanupDay 'Saturday'" -ForegroundColor Yellow
    Write-Host "" 
    exit 0
}

# Ejecutar acción solicitada
if ($Install) {
    Install-BackupTasks
} elseif ($Uninstall) {
    Uninstall-BackupTasks
} elseif ($Status) {
    Show-TaskStatus
}