# Script de Limpieza de Backups Antiguos
# Mantiene solo los backups más recientes según política de retención

param(
    [string]$BackupPath = "./backups",
    [int]$KeepDays = 30,
    [int]$KeepWeekly = 4,
    [int]$KeepMonthly = 12,
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

# Función para logging
function Write-Log {
    param($Message, $Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

# Función para obtener fecha del nombre del backup
function Get-BackupDate {
    param($FileName)
    
    if ($FileName -match "catequesis_backup_(\d{8})_(\d{6})") {
        $dateStr = $matches[1]
        $timeStr = $matches[2]
        try {
            return [DateTime]::ParseExact("$dateStr$timeStr", "yyyyMMddHHmmss", $null)
        } catch {
            return $null
        }
    }
    return $null
}

# Función para formatear tamaño
function Format-FileSize {
    param($Bytes)
    if ($Bytes -gt 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    if ($Bytes -gt 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    if ($Bytes -gt 1KB) { return "{0:N2} KB" -f ($Bytes / 1KB) }
    return "$Bytes bytes"
}

Write-Log "Iniciando limpieza de backups en: $BackupPath" "Green"

if (!(Test-Path $BackupPath)) {
    Write-Log "Directorio de backups no existe: $BackupPath" "Red"
    exit 1
}

# Obtener todos los archivos de backup
$backupFiles = Get-ChildItem $BackupPath -Name "catequesis_backup_*.zip" | ForEach-Object {
    $fullPath = Join-Path $BackupPath $_
    $date = Get-BackupDate $_
    if ($date) {
        [PSCustomObject]@{
            Name = $_
            FullPath = $fullPath
            Date = $date
            Size = (Get-Item $fullPath).Length
            Age = (Get-Date) - $date
        }
    }
} | Where-Object { $_ -ne $null } | Sort-Object Date -Descending

if (!$backupFiles) {
    Write-Log "No se encontraron archivos de backup" "Yellow"
    exit 0
}

Write-Log "Encontrados $($backupFiles.Count) archivos de backup" "Cyan"

# Mostrar estadísticas
$totalSize = ($backupFiles | Measure-Object Size -Sum).Sum
Write-Log "Tamaño total: $(Format-FileSize $totalSize)" "Cyan"

# Clasificar backups por política de retención
$now = Get-Date
$toKeep = @()
$toDelete = @()

# 1. Mantener backups diarios recientes
$dailyBackups = $backupFiles | Where-Object { $_.Age.TotalDays -le $KeepDays }
$toKeep += $dailyBackups
Write-Log "Manteniendo $($dailyBackups.Count) backups diarios (últimos $KeepDays días)" "Green"

# 2. Mantener backups semanales
$weeklyBackups = $backupFiles | Where-Object { 
    $_.Age.TotalDays -gt $KeepDays -and $_.Age.TotalDays -le ($KeepWeekly * 7)
} | Group-Object { $_.Date.ToString("yyyy-ww") } | ForEach-Object { 
    $_.Group | Sort-Object Date -Descending | Select-Object -First 1 
}
$toKeep += $weeklyBackups
Write-Log "Manteniendo $($weeklyBackups.Count) backups semanales (últimas $KeepWeekly semanas)" "Green"

# 3. Mantener backups mensuales
$monthlyBackups = $backupFiles | Where-Object { 
    $_.Age.TotalDays -gt ($KeepWeekly * 7) -and $_.Age.TotalDays -le ($KeepMonthly * 30)
} | Group-Object { $_.Date.ToString("yyyy-MM") } | ForEach-Object { 
    $_.Group | Sort-Object Date -Descending | Select-Object -First 1 
}
$toKeep += $monthlyBackups
Write-Log "Manteniendo $($monthlyBackups.Count) backups mensuales (últimos $KeepMonthly meses)" "Green"

# 4. Mantener backups anuales (más antiguos)
$yearlyBackups = $backupFiles | Where-Object { 
    $_.Age.TotalDays -gt ($KeepMonthly * 30)
} | Group-Object { $_.Date.ToString("yyyy") } | ForEach-Object { 
    $_.Group | Sort-Object Date -Descending | Select-Object -First 1 
}
$toKeep += $yearlyBackups
Write-Log "Manteniendo $($yearlyBackups.Count) backups anuales" "Green"

# Eliminar duplicados de la lista de mantener
$toKeepUnique = $toKeep | Sort-Object FullPath -Unique

# Determinar qué eliminar
$toDelete = $backupFiles | Where-Object { $_.FullPath -notin $toKeepUnique.FullPath }

Write-Log "" 
Write-Log "=== RESUMEN DE LIMPIEZA ===" "Cyan"
Write-Log "Total de backups: $($backupFiles.Count)" "White"
Write-Log "A mantener: $($toKeepUnique.Count)" "Green"
Write-Log "A eliminar: $($toDelete.Count)" "Red"

if ($toDelete.Count -gt 0) {
    $deleteSize = ($toDelete | Measure-Object Size -Sum).Sum
    Write-Log "Espacio a liberar: $(Format-FileSize $deleteSize)" "Yellow"
    
    if ($Verbose -or $DryRun) {
        Write-Log "" 
        Write-Log "Archivos a eliminar:" "Red"
        $toDelete | ForEach-Object {
            Write-Log "  - $($_.Name) ($(Format-FileSize $_.Size), $([int]$_.Age.TotalDays) días)" "Gray"
        }
    }
    
    if ($DryRun) {
        Write-Log "" 
        Write-Log "MODO SIMULACIÓN - No se eliminaron archivos" "Yellow"
        Write-Log "Para ejecutar la limpieza real, omitir el parámetro -DryRun" "Yellow"
    } else {
        Write-Log "" 
        Write-Log "Eliminando archivos antiguos..." "Yellow"
        
        $deleted = 0
        $errors = 0
        
        foreach ($file in $toDelete) {
            try {
                Remove-Item $file.FullPath -Force
                $deleted++
                if ($Verbose) {
                    Write-Log "  ✓ Eliminado: $($file.Name)" "Gray"
                }
            } catch {
                $errors++
                Write-Log "  ✗ Error eliminando $($file.Name): $($_.Exception.Message)" "Red"
            }
        }
        
        Write-Log "" 
        Write-Log "✅ Limpieza completada" "Green"
        Write-Log "Archivos eliminados: $deleted" "Green"
        if ($errors -gt 0) {
            Write-Log "Errores: $errors" "Red"
        }
        Write-Log "Espacio liberado: $(Format-FileSize $deleteSize)" "Green"
    }
} else {
    Write-Log "No hay archivos para eliminar" "Green"
}

Write-Log "" 
Write-Log "Limpieza finalizada" "Green"