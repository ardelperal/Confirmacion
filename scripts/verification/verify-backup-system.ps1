# Script de Verificación del Sistema de Backup
# Verifica la integridad y configuración del sistema de backup seguro

param(
    [switch]$Quick = $false,
    [switch]$Detailed = $false,
    [switch]$Fix = $false
)

# Función para logging con colores
function Write-Status {
    param($Message, $Status = "INFO", $Color = "White")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $prefix = switch ($Status) {
        "OK" { "✅" }
        "WARN" { "⚠️" }
        "ERROR" { "❌" }
        "INFO" { "ℹ️" }
        "FIX" { "🔧" }
        default { "📋" }
    }
    Write-Host "[$timestamp] $prefix $Message" -ForegroundColor $Color
}

# Contadores de verificación
$checks = @{
    Total = 0
    Passed = 0
    Warnings = 0
    Errors = 0
    Fixed = 0
}

function Test-Component {
    param($Name, $Test, $Fix = $null)
    $checks.Total++
    
    try {
        $result = & $Test
        if ($result.Status -eq "OK") {
            Write-Status "$Name" "OK" "Green"
            $checks.Passed++
        } elseif ($result.Status -eq "WARN") {
            Write-Status "$Name - $($result.Message)" "WARN" "Yellow"
            $checks.Warnings++
            
            if ($Fix -and $result.Fixable) {
                try {
                    & $Fix
                    Write-Status "$Name - Corregido automáticamente" "FIX" "Cyan"
                    $checks.Fixed++
                } catch {
                    Write-Status "$Name - Error al corregir: $($_.Exception.Message)" "ERROR" "Red"
                }
            }
        } else {
            Write-Status "$Name - $($result.Message)" "ERROR" "Red"
            $checks.Errors++
        }
    } catch {
        Write-Status "$Name - Error en verificación: $($_.Exception.Message)" "ERROR" "Red"
        $checks.Errors++
    }
}

# Verificaciones del sistema

# 1. Verificar archivos del sistema
function Test-BackupFiles {
    $files = @(
        "backup.ps1",
        "cleanup-backups.ps1", 
        "setup-backup-schedule.ps1",
        "backup-exclude.conf",
        "BACKUP_SEGURO.md"
    )
    
    $missing = @()
    foreach ($file in $files) {
        if (!(Test-Path $file)) {
            $missing += $file
        }
    }
    
    if ($missing.Count -eq 0) {
        return @{ Status = "OK" }
    } else {
        return @{ Status = "ERROR"; Message = "Archivos faltantes: $($missing -join ', ')" }
    }
}

# 2. Verificar directorio de backups
function Test-BackupDirectory {
    $backupDir = "./backups"
    
    if (!(Test-Path $backupDir)) {
        return @{ Status = "WARN"; Message = "Directorio de backups no existe"; Fixable = $true }
    }
    
    # Verificar permisos en Windows
    if ($IsWindows -or $env:OS -eq "Windows_NT") {
        try {
            $acl = Get-Acl $backupDir
            $hasRestrictedAccess = $acl.Access | Where-Object { 
                $_.IdentityReference -like "*Users*" -and $_.AccessControlType -eq "Allow"
            }
            
            if ($hasRestrictedAccess) {
                return @{ Status = "WARN"; Message = "Permisos del directorio podrían ser inseguros"; Fixable = $true }
            }
        } catch {
            return @{ Status = "WARN"; Message = "No se pudieron verificar permisos" }
        }
    }
    
    return @{ Status = "OK" }
}

function Fix-BackupDirectory {
    $backupDir = "./backups"
    
    if (!(Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Write-Status "Directorio de backups creado" "FIX" "Cyan"
    }
    
    # Aplicar permisos seguros
    if ($IsWindows -or $env:OS -eq "Windows_NT") {
        try {
            $acl = Get-Acl $backupDir
            $acl.SetAccessRuleProtection($true, $false)
            $adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
            $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
            $acl.SetAccessRule($adminRule)
            $acl.SetAccessRule($systemRule)
            Set-Acl $backupDir $acl
        } catch {
            Write-Status "Error aplicando permisos seguros" "WARN" "Yellow"
        }
    }
}

# 3. Verificar configuración de exclusiones
function Test-ExcludeConfig {
    $excludeFile = "backup-exclude.conf"
    
    if (!(Test-Path $excludeFile)) {
        return @{ Status = "ERROR"; Message = "Archivo de exclusiones no encontrado" }
    }
    
    $content = Get-Content $excludeFile -Raw
    $requiredPatterns = @(".env", "*.key", "*.pem")
    $missing = @()
    
    foreach ($pattern in $requiredPatterns) {
        if ($content -notmatch [regex]::Escape($pattern)) {
            $missing += $pattern
        }
    }
    
    if ($missing.Count -gt 0) {
        return @{ Status = "WARN"; Message = "Patrones de exclusión faltantes: $($missing -join ', ')" }
    }
    
    return @{ Status = "OK" }
}

# 4. Verificar archivos .env
function Test-EnvFiles {
    $envFiles = Get-ChildItem -Name ".env*" -ErrorAction SilentlyContinue
    
    if ($envFiles.Count -eq 0) {
        return @{ Status = "OK"; Message = "No hay archivos .env" }
    }
    
    # Verificar que no estén en backups recientes
    $backupDir = "./backups"
    if (Test-Path $backupDir) {
        $recentBackup = Get-ChildItem $backupDir -Name "catequesis_backup_*.zip" | Sort-Object | Select-Object -Last 1
        if ($recentBackup) {
            $backupPath = Join-Path $backupDir $recentBackup
            try {
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                $zip = [System.IO.Compression.ZipFile]::OpenRead($backupPath)
                $hasEnv = $zip.Entries | Where-Object { $_.FullName -match "\.env" }
                $zip.Dispose()
                
                if ($hasEnv) {
                    return @{ Status = "ERROR"; Message = "Archivos .env encontrados en backup reciente" }
                }
            } catch {
                return @{ Status = "WARN"; Message = "No se pudo verificar contenido del backup" }
            }
        }
    }
    
    return @{ Status = "OK" }
}

# 5. Verificar tareas programadas
function Test-ScheduledTasks {
    if (!($IsWindows -or $env:OS -eq "Windows_NT")) {
        return @{ Status = "OK"; Message = "Verificación de tareas no aplicable en este sistema" }
    }
    
    $backupTask = Get-ScheduledTask -TaskName "CatequesisBackup-Daily" -ErrorAction SilentlyContinue
    $cleanupTask = Get-ScheduledTask -TaskName "CatequesisBackup-Cleanup" -ErrorAction SilentlyContinue
    
    if (!$backupTask -and !$cleanupTask) {
        return @{ Status = "WARN"; Message = "No hay tareas programadas configuradas" }
    }
    
    $issues = @()
    if ($backupTask -and $backupTask.State -ne "Ready") {
        $issues += "Tarea de backup: $($backupTask.State)"
    }
    if ($cleanupTask -and $cleanupTask.State -ne "Ready") {
        $issues += "Tarea de limpieza: $($cleanupTask.State)"
    }
    
    if ($issues.Count -gt 0) {
        return @{ Status = "WARN"; Message = $issues -join ", " }
    }
    
    return @{ Status = "OK" }
}

# 6. Verificar integridad de backups existentes
function Test-BackupIntegrity {
    $backupDir = "./backups"
    if (!(Test-Path $backupDir)) {
        return @{ Status = "OK"; Message = "No hay backups para verificar" }
    }
    
    $backups = Get-ChildItem $backupDir -Name "catequesis_backup_*.zip" -ErrorAction SilentlyContinue
    if ($backups.Count -eq 0) {
        return @{ Status = "OK"; Message = "No hay backups para verificar" }
    }
    
    $corrupted = @()
    foreach ($backup in $backups | Select-Object -First 3) {  # Solo verificar los 3 más recientes
        $backupPath = Join-Path $backupDir $backup
        try {
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            $zip = [System.IO.Compression.ZipFile]::OpenRead($backupPath)
            $zip.Dispose()
        } catch {
            $corrupted += $backup
        }
    }
    
    if ($corrupted.Count -gt 0) {
        return @{ Status = "ERROR"; Message = "Backups corruptos: $($corrupted -join ', ')" }
    }
    
    return @{ Status = "OK" }
}

# Ejecutar verificaciones
Write-Status "🔍 VERIFICACIÓN DEL SISTEMA DE BACKUP SEGURO" "INFO" "Cyan"
Write-Status "" 

Test-Component "Archivos del sistema" { Test-BackupFiles }
Test-Component "Directorio de backups" { Test-BackupDirectory } { Fix-BackupDirectory }
Test-Component "Configuración de exclusiones" { Test-ExcludeConfig }
Test-Component "Protección de archivos .env" { Test-EnvFiles }
Test-Component "Tareas programadas" { Test-ScheduledTasks }

if (!$Quick) {
    Test-Component "Integridad de backups" { Test-BackupIntegrity }
}

# Verificaciones detalladas
if ($Detailed) {
    Write-Status "" 
    Write-Status "📊 INFORMACIÓN DETALLADA" "INFO" "Cyan"
    
    # Estadísticas de backups
    $backupDir = "./backups"
    if (Test-Path $backupDir) {
        $backups = Get-ChildItem $backupDir -Name "catequesis_backup_*.zip" -ErrorAction SilentlyContinue
        if ($backups) {
            $totalSize = ($backups | ForEach-Object { (Get-Item (Join-Path $backupDir $_)).Length } | Measure-Object -Sum).Sum
            Write-Status "Backups encontrados: $($backups.Count)" "INFO" "White"
            Write-Status "Tamaño total: $([math]::Round($totalSize / 1MB, 2)) MB" "INFO" "White"
            
            $newest = $backups | Sort-Object | Select-Object -Last 1
            $oldest = $backups | Sort-Object | Select-Object -First 1
            Write-Status "Más reciente: $newest" "INFO" "White"
            Write-Status "Más antiguo: $oldest" "INFO" "White"
        }
    }
    
    # Verificar archivos sensibles
    $sensitiveFiles = Get-ChildItem -Name ".env*", "*.key", "*.pem", "*.p12", "*.pfx" -ErrorAction SilentlyContinue
    if ($sensitiveFiles) {
        Write-Status "Archivos sensibles detectados: $($sensitiveFiles.Count)" "INFO" "Yellow"
        $sensitiveFiles | ForEach-Object { Write-Status "  - $_" "INFO" "Gray" }
    }
}

# Resumen final
Write-Status "" 
Write-Status "📋 RESUMEN DE VERIFICACIÓN" "INFO" "Cyan"
Write-Status "Total de verificaciones: $($checks.Total)" "INFO" "White"
Write-Status "Exitosas: $($checks.Passed)" "OK" "Green"
if ($checks.Warnings -gt 0) {
    Write-Status "Advertencias: $($checks.Warnings)" "WARN" "Yellow"
}
if ($checks.Errors -gt 0) {
    Write-Status "Errores: $($checks.Errors)" "ERROR" "Red"
}
if ($checks.Fixed -gt 0) {
    Write-Status "Corregidos: $($checks.Fixed)" "FIX" "Cyan"
}

# Recomendaciones
Write-Status "" 
if ($checks.Errors -gt 0) {
    Write-Status "❌ Sistema requiere atención inmediata" "ERROR" "Red"
    exit 1
} elseif ($checks.Warnings -gt 0) {
    Write-Status "⚠️ Sistema funcional con advertencias" "WARN" "Yellow"
    Write-Status "Ejecutar con -Fix para corregir automáticamente" "INFO" "Yellow"
    exit 2
} else {
    Write-Status "✅ Sistema de backup seguro funcionando correctamente" "OK" "Green"
    exit 0
}