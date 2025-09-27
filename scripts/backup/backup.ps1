# Script de Backup Seguro para Sistema de Catequesis
# Crea una copia de seguridad de todos los datos modificables por el párroco
# EXCLUYE archivos sensibles (.env) por defecto para evitar filtrar secretos

param(
    [string]$BackupPath = "./backups",
    [switch]$Compress = $false,
    [switch]$IncludeSecrets = $false,  # Requiere confirmación explícita para incluir .env
    [switch]$EncryptSecrets = $false   # Cifra .env por separado si se incluye
)

# Configuración
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "catequesis_backup_$timestamp"
$fullBackupPath = Join-Path $BackupPath $backupName

# Validar y crear directorio de backup con permisos seguros
Write-Host "Validando directorio de backup: $BackupPath" -ForegroundColor Yellow

# Verificar que el directorio padre existe y tiene permisos seguros
if (!(Test-Path $BackupPath)) {
    Write-Host "Creando directorio de backups: $BackupPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
}

# Verificar permisos del directorio de backups
if ($IsLinux -or $IsMacOS) {
    try {
        $permissions = (Get-Item $BackupPath).UnixFileMode
        # Verificar si otros usuarios tienen permisos (bits 077 en octal = 63 en decimal)
        if ($permissions -band 63) {
            Write-Host "⚠ ADVERTENCIA: El directorio $BackupPath tiene permisos inseguros" -ForegroundColor Red
            Write-Host "  Aplicando permisos seguros (700)..." -ForegroundColor Yellow
            & chmod 700 $BackupPath
        }
    } catch {
        Write-Host "⚠ No se pudieron verificar permisos Unix en este sistema" -ForegroundColor Yellow
    }
} else {
    # En Windows, verificar que solo el propietario tiene acceso
    $acl = Get-Acl $BackupPath
    $hasOtherAccess = $acl.Access | Where-Object { 
        $_.IdentityReference -ne [System.Security.Principal.WindowsIdentity]::GetCurrent().Name -and
        $_.AccessControlType -eq 'Allow'
    }
    if ($hasOtherAccess) {
        Write-Host "⚠ ADVERTENCIA: El directorio $BackupPath tiene acceso para otros usuarios" -ForegroundColor Red
        Write-Host "  Aplicando permisos seguros..." -ForegroundColor Yellow
        $acl.SetAccessRuleProtection($true, $false)
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
            "FullControl",
            "ContainerInherit,ObjectInherit",
            "None",
            "Allow"
        )
        $acl.SetAccessRule($accessRule)
        Set-Acl -Path $BackupPath -AclObject $acl
    }
}

Write-Host "Creando backup en: $fullBackupPath" -ForegroundColor Green
New-Item -ItemType Directory -Path $fullBackupPath -Force | Out-Null

# Configurar permisos seguros (solo propietario)
if ($IsLinux -or $IsMacOS) {
    try {
        & chmod 700 $fullBackupPath
        Write-Host "✓ Permisos seguros aplicados (700)" -ForegroundColor Green
    } catch {
        Write-Host "⚠ No se pudieron aplicar permisos Unix" -ForegroundColor Yellow
    }
} else {
    # En Windows, remover herencia y dar acceso solo al usuario actual
    $acl = Get-Acl $fullBackupPath
    $acl.SetAccessRuleProtection($true, $false)
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
        "FullControl",
        "ContainerInherit,ObjectInherit",
        "None",
        "Allow"
    )
    $acl.SetAccessRule($accessRule)
    Set-Acl -Path $fullBackupPath -AclObject $acl
    Write-Host "✓ Permisos seguros aplicados (solo usuario actual)" -ForegroundColor Green
}

# Cargar patrones de exclusión desde archivo de configuración
$excludeConfigPath = "./backup-exclude.conf"
$sensitivePatterns = @()

if (Test-Path $excludeConfigPath) {
    $sensitivePatterns = Get-Content $excludeConfigPath | Where-Object { 
        $_ -and !$_.StartsWith('#') -and $_.Trim() -ne '' 
    } | ForEach-Object { $_.Trim() }
    Write-Host "✓ Cargados $(($sensitivePatterns | Measure-Object).Count) patrones de exclusión" -ForegroundColor Green
} else {
    # Patrones por defecto si no existe el archivo de configuración
    $sensitivePatterns = @(
        "*.env*", "*.key", "*.pem", "*.p12", "*.pfx",
        "*secret*", "*password*", "*credential*", "*token*",
        ".git", "node_modules", "*.log", "*.tmp", "*.backup"
    )
    Write-Host "⚠ Usando patrones de exclusión por defecto" -ForegroundColor Yellow
}

# Función para copiar con verificación y exclusión de archivos sensibles
function Copy-WithVerification {
    param($Source, $Destination, $Description, [switch]$ExcludeSensitive = $true)
    
    if (Test-Path $Source) {
        Write-Host "Copiando $Description..." -ForegroundColor Yellow
        
        if ($ExcludeSensitive -and (Test-Path $Source -PathType Container)) {
            # Copiar directorio excluyendo archivos sensibles
            robocopy $Source $Destination /E /XF $sensitivePatterns /XD .git node_modules /NFL /NDL /NJH /NJS /NC /NS /NP
            if ($LASTEXITCODE -le 1) { # robocopy códigos 0-1 son éxito
                Write-Host "✓ $Description copiado (archivos sensibles excluidos)" -ForegroundColor Green
            } else {
                Write-Host "⚠ Error al copiar $Description" -ForegroundColor Red
            }
        } else {
            # Copia normal para archivos individuales
            Copy-Item -Path $Source -Destination $Destination -Recurse -Force
            Write-Host "✓ $Description copiado" -ForegroundColor Green
        }
        
        # Aplicar permisos seguros al archivo/directorio copiado
        if ($IsLinux -or $IsMacOS) {
            try {
                & chmod 600 $Destination
            } catch {
                Write-Host "⚠ No se pudieron aplicar permisos Unix" -ForegroundColor Yellow
            }
        } else {
            $acl = Get-Acl $Destination
            $acl.SetAccessRuleProtection($true, $false)
            $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
                [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
                "FullControl",
                "ContainerInherit,ObjectInherit",
                "None",
                "Allow"
            )
            $acl.SetAccessRule($accessRule)
            Set-Acl -Path $Destination -AclObject $acl
        }
    } else {
        Write-Host "⚠ $Description no encontrado en: $Source" -ForegroundColor Orange
    }
}

# Backup de contenido de sesiones (modificable por párroco)
Copy-WithVerification "./data/content" "$fullBackupPath/content" "Contenido de sesiones"

# Backup de autenticación del párroco
Copy-WithVerification "./data/auth" "$fullBackupPath/auth" "Configuración de autenticación"

# Manejo seguro de archivos de configuración
if (Test-Path "./.env") {
    if ($IncludeSecrets) {
        if ($EncryptSecrets) {
            Write-Host "Cifrando archivo .env por separado..." -ForegroundColor Yellow
            # Crear archivo cifrado con gpg si está disponible
            if (Get-Command gpg -ErrorAction SilentlyContinue) {
                gpg --symmetric --cipher-algo AES256 --output "$fullBackupPath/.env.gpg" "./.env"
                Write-Host "✓ Archivo .env cifrado como .env.gpg" -ForegroundColor Green
            } else {
                Write-Host "⚠ GPG no disponible. Copiando .env sin cifrar (NO RECOMENDADO)" -ForegroundColor Red
                Copy-WithVerification "./.env" "$fullBackupPath/.env" "Configuración del entorno"
            }
        } else {
            Write-Host "⚠ ADVERTENCIA: Incluyendo .env sin cifrar (RIESGO DE SEGURIDAD)" -ForegroundColor Red
            Copy-WithVerification "./.env" "$fullBackupPath/.env" "Configuración del entorno"
        }
    } else {
        Write-Host "✓ Archivo .env EXCLUIDO del backup por seguridad" -ForegroundColor Green
        Write-Host "  Para incluirlo: usar -IncludeSecrets (o -EncryptSecrets para cifrarlo)" -ForegroundColor Gray
    }
}

# Crear archivo de información del backup
# Generar información del backup con detalles de seguridad
$secretsStatus = if ($IncludeSecrets) {
    if ($EncryptSecrets) { "INCLUIDOS Y CIFRADOS (.env.gpg)" } else { "INCLUIDOS SIN CIFRAR (RIESGO)" }
} else { "EXCLUIDOS POR SEGURIDAD" }

$backupInfo = @"
BACKUP SEGURO - INFORMACIÓN
===========================
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Sistema: Catequesis para Confirmación
Tipo: Datos modificables por párroco
Permisos: Restringidos al propietario

CONTENIDO DEL BACKUP:
- data/content/     → Sesiones y módulos de catequesis
- data/auth/        → Configuración de contraseña del párroco
- Archivos .env     → $secretsStatus

ARCHIVOS EXCLUIDOS POR SEGURIDAD:
- *.env* (variables de entorno)
- *.key, *.pem (claves privadas)
- *.log (archivos de registro)
- .git/ (control de versiones)
- node_modules/ (dependencias)

RESTAURACIÓN:
1. Detener Docker: docker-compose down
2. Restaurar archivos: copiar contenido a las carpetas originales
3. Verificar permisos: chown -R 1001:1001 ./data/
4. Si hay .env.gpg: gpg --decrypt .env.gpg > .env
5. Reiniciar: docker-compose up -d

SEGURIDAD:
- Backup con permisos 700 (solo propietario)
- Archivos sensibles excluidos por defecto
- Variables de entorno cifradas si se incluyen
- Este backup NO incluye la contraseña maestra del desarrollador

PARA INCLUIR SECRETOS (NO RECOMENDADO):
- Usar: ./backup.ps1 -IncludeSecrets
- Mejor: ./backup.ps1 -EncryptSecrets (requiere GPG)

Para recuperación completa, consultar RECUPERACION_CONTRASEÑA.md
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