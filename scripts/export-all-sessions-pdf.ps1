# Script para exportar todas las sesiones de confirmación a PDF
# Autor: Sistema de Confirmación
# Fecha: $(Get-Date -Format "yyyy-MM-dd")

param(
    [string]$ServerUrl = "http://localhost:3000",
    [string]$OutputDir = ".\pdfs-sesiones",
    [string]$Username = "admin",
    [string]$Password = "Arm1833a"
)

# Configuración
$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# Función para escribir logs con timestamp
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path "export-sessions.log" -Value $logMessage
}

# Función para autenticarse y obtener sesión web
function Get-AuthSession {
    param([string]$ServerUrl, [string]$Username, [string]$Password)
    
    try {
        Write-Log "Iniciando autenticación..."
        $loginBody = @{
            username = $Username
            password = $Password
        } | ConvertTo-Json
        
        # Crear sesión web para mantener cookies
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        
        $loginResponse = Invoke-RestMethod -Uri "$ServerUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session
        
        if ($loginResponse.success) {
            Write-Log "Autenticación exitosa"
            return $session
        } else {
            throw "Error en autenticación: $($loginResponse.error)"
        }
    } catch {
        Write-Log "Error en autenticación: $($_.Exception.Message)" "ERROR"
        throw
    }
}

# Función para obtener lista de todas las sesiones
function Get-AllSessions {
    param([string]$ServerUrl, [Microsoft.PowerShell.Commands.WebRequestSession]$Session)
    
    try {
        Write-Log "Obteniendo lista de sesiones..."
        
        $sessionsResponse = Invoke-RestMethod -Uri "$ServerUrl/api/admin/list" -Method GET -WebSession $Session
        
        if ($sessionsResponse.ok) {
            Write-Log "Se encontraron $($sessionsResponse.sessions.Count) sesiones"
            return $sessionsResponse.sessions
        } else {
            throw "Error obteniendo sesiones: $($sessionsResponse.error)"
        }
    } catch {
        Write-Log "Error obteniendo lista de sesiones: $($_.Exception.Message)" "ERROR"
        throw
    }
}

# Función para descargar PDF de una sesión
function Download-SessionPDF {
    param([string]$ServerUrl, [string]$SessionCode, [string]$OutputPath, [Microsoft.PowerShell.Commands.WebRequestSession]$Session)
    
    try {
        $pdfUrl = "$ServerUrl/api/export/pdf/$SessionCode"
        Write-Log "Descargando PDF para sesión $SessionCode..."
        
        # Descargar el PDF usando la sesión web
        $response = Invoke-WebRequest -Uri $pdfUrl -WebSession $Session -OutFile $OutputPath
        
        if (Test-Path $OutputPath) {
            $fileSize = (Get-Item $OutputPath).Length
            Write-Log "PDF descargado exitosamente: $OutputPath ($fileSize bytes)"
            return $true
        } else {
            Write-Log "Error: No se pudo crear el archivo PDF" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Error descargando PDF para sesión $SessionCode`: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Función principal
function Export-AllSessionsPDF {
    param([string]$ServerUrl, [string]$OutputDir, [string]$Username, [string]$Password)
    
    Write-Log "=== INICIO DE EXPORTACIÓN DE SESIONES A PDF ==="
    Write-Log "Servidor: $ServerUrl"
    Write-Log "Directorio de salida: $OutputDir"
    
    try {
        # Crear directorio de salida si no existe
        if (-not (Test-Path $OutputDir)) {
            New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
            Write-Log "Directorio creado: $OutputDir"
        }
        
        # Autenticarse
        $webSession = Get-AuthSession -ServerUrl $ServerUrl -Username $Username -Password $Password
        
        # Obtener lista de sesiones
        $sessions = Get-AllSessions -ServerUrl $ServerUrl -Session $webSession
        
        if ($sessions.Count -eq 0) {
            Write-Log "No se encontraron sesiones para exportar" "WARNING"
            return
        }
        
        # Contadores para estadísticas
        $totalSessions = $sessions.Count
        $successCount = 0
        $errorCount = 0
        
        Write-Log "Iniciando descarga de $totalSessions sesiones..."
        
        # Procesar cada sesión
        for ($i = 0; $i -lt $sessions.Count; $i++) {
            $session = $sessions[$i]
            $sessionCode = $session.code
            $sessionTitle = $session.title
            
            # Mostrar progreso
            $percentComplete = [math]::Round(($i / $totalSessions) * 100, 1)
            Write-Progress -Activity "Exportando sesiones a PDF" -Status "Procesando $sessionCode - $sessionTitle" -PercentComplete $percentComplete
            
            # Generar nombre de archivo seguro
            $safeTitle = $sessionTitle -replace '[^\w\s-]', '' -replace '\s+', '_'
            $fileName = "$sessionCode`_$safeTitle.pdf"
            $outputPath = Join-Path $OutputDir $fileName
            
            # Descargar PDF
            $success = Download-SessionPDF -ServerUrl $ServerUrl -SessionCode $sessionCode -OutputPath $outputPath -Session $webSession
            
            if ($success) {
                $successCount++
            } else {
                $errorCount++
            }
            
            # Pequeña pausa para no sobrecargar el servidor
            Start-Sleep -Milliseconds 500
        }
        
        # Completar barra de progreso
        Write-Progress -Activity "Exportando sesiones a PDF" -Completed
        
        # Estadísticas finales
        Write-Log "=== RESUMEN DE EXPORTACIÓN ==="
        Write-Log "Total de sesiones: $totalSessions"
        Write-Log "Exitosas: $successCount"
        Write-Log "Con errores: $errorCount"
        Write-Log "Directorio de salida: $OutputDir"
        
        if ($errorCount -eq 0) {
            Write-Log "¡Exportación completada exitosamente!" "SUCCESS"
        } else {
            Write-Log "Exportación completada con algunos errores. Revisa el log para más detalles." "WARNING"
        }
        
    } catch {
        Write-Log "Error crítico durante la exportación: $($_.Exception.Message)" "ERROR"
        throw
    }
}

# Ejecutar script principal
try {
    Export-AllSessionsPDF -ServerUrl $ServerUrl -OutputDir $OutputDir -Username $Username -Password $Password
} catch {
    Write-Log "El script terminó con errores: $($_.Exception.Message)" "ERROR"
    exit 1
}

Write-Log "Script completado."