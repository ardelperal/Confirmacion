# Script de verificación para despliegue en NAS (PowerShell)
# Ejecutar antes del primer despliegue

Write-Host "=== Verificación de Configuración para NAS ===" -ForegroundColor Cyan
Write-Host ""

$errors = 0

# Verificar archivos necesarios
Write-Host "1. Verificando archivos de configuración..." -ForegroundColor Yellow
$files = @("docker-compose.yml", ".env", "web\Dockerfile", "web\next.config.js")
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ $file existe" -ForegroundColor Green
    } else {
        Write-Host "✗ $file NO ENCONTRADO" -ForegroundColor Red
        $errors++
    }
}
Write-Host ""

# Verificar configuración de .env
Write-Host "2. Verificando configuración .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "<IP_NAS>") {
        Write-Host "⚠️  ADVERTENCIA: Cambiar <IP_NAS> por la IP real del NAS en .env" -ForegroundColor Yellow
    }
    
    if ($envContent -match "CambiarPorPasswordSegura123!") {
        Write-Host "⚠️  ADVERTENCIA: Cambiar ADMIN_PASSWORD por una contraseña segura en .env" -ForegroundColor Yellow
    }
    
    if ($envContent -match "jwt-secret-key-muy-seguro-para-nas-2024") {
        Write-Host "⚠️  ADVERTENCIA: Cambiar JWT_SECRET por un valor único en .env" -ForegroundColor Yellow
    }
}
Write-Host ""

# Verificar Next.js standalone
Write-Host "3. Verificando configuración Next.js..." -ForegroundColor Yellow
if (Test-Path "web\next.config.js") {
    $nextConfig = Get-Content "web\next.config.js" -Raw
    if ($nextConfig -match "output: 'standalone'") {
        Write-Host "✓ Next.js configurado para standalone" -ForegroundColor Green
    } else {
        Write-Host "✗ Next.js NO configurado para standalone" -ForegroundColor Red
        $errors++
    }
}
Write-Host ""

# Crear directorio de contenido
Write-Host "4. Configurando directorios..." -ForegroundColor Yellow
if (!(Test-Path "data\content")) {
    New-Item -ItemType Directory -Path "data\content" -Force | Out-Null
}
Write-Host "✓ Directorio .\data\content creado" -ForegroundColor Green
Write-Host ""

# Verificar Docker
Write-Host "5. Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✓ Docker instalado: $($dockerVersion.Split(' ')[2])" -ForegroundColor Green
        
        # Verificar Docker Compose
        try {
            $composeVersion = docker compose version 2>$null
            if ($composeVersion) {
                Write-Host "✓ Docker Compose disponible" -ForegroundColor Green
            } else {
                Write-Host "✗ Docker Compose NO disponible" -ForegroundColor Red
                $errors++
            }
        } catch {
            Write-Host "✗ Docker Compose NO disponible" -ForegroundColor Red
            $errors++
        }
    } else {
        Write-Host "✗ Docker NO instalado" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "✗ Docker NO instalado" -ForegroundColor Red
    $errors++
}
Write-Host ""

# Verificar puertos
Write-Host "6. Verificando puertos..." -ForegroundColor Yellow
$ports = @(8080, 3001)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "⚠️  Puerto $port ya está en uso" -ForegroundColor Yellow
    } else {
        Write-Host "✓ Puerto $port disponible" -ForegroundColor Green
    }
}
Write-Host ""

# Resumen
Write-Host "=== Resumen ===" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "✓ Configuración lista para despliegue" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos pasos:" -ForegroundColor White
    Write-Host "1. Editar .env con los valores correctos" -ForegroundColor White
    Write-Host "2. docker compose build" -ForegroundColor White
    Write-Host "3. docker compose up -d" -ForegroundColor White
    Write-Host "4. Acceder a http://<IP_NAS>:8080/" -ForegroundColor White
} else {
    Write-Host "✗ Se encontraron $errors errores. Corregir antes de continuar." -ForegroundColor Red
}
Write-Host ""
Write-Host "Para más detalles, consultar DESPLIEGUE_NAS.md" -ForegroundColor Cyan

# Pausa para leer el resultado
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")