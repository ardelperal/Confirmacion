param([switch]$Update)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Has-Submodule {
    return (Test-Path ".gitmodules") -and (Select-String -Path ".gitmodules" -Pattern "external/catequesis" -Quiet)
}

Write-Host "🔧 Configurando submódulo de catequesis..." -ForegroundColor Cyan

if (-not (Has-Submodule)) {
    Write-Host "📦 Añadiendo submódulo external/catequesis..." -ForegroundColor Yellow
    git submodule add https://github.com/ardelperal/catequesis.git external/catequesis
    Write-Host "✅ Submódulo añadido" -ForegroundColor Green
} else {
    Write-Host "📦 Submódulo ya existe" -ForegroundColor Green
}

Write-Host "🔄 Inicializando submódulos..." -ForegroundColor Yellow
git submodule update --init --recursive

if ($Update) {
    Write-Host "⬆️ Actualizando submódulo desde remoto..." -ForegroundColor Yellow
    git submodule update --remote external/catequesis
    Write-Host "✅ Submódulo actualizado" -ForegroundColor Green
}

# Instalar dependencias si faltan
if (-not (Test-Path "$repoRoot\node_modules")) {
    Write-Host "📦 Instalando dependencias npm..." -ForegroundColor Yellow
    npm ci
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "📦 Dependencias ya instaladas" -ForegroundColor Green
}

# Ejecutar sincronización
Write-Host "🔄 Sincronizando recursos de catequesis..." -ForegroundColor Yellow
npm run sync:catequesis

Write-Host "" 
Write-Host "🎉 Listo: submódulo y sincronización OK." -ForegroundColor Green
Write-Host "📁 Recursos disponibles en: web/public/recursos/catequesis/" -ForegroundColor Cyan
Write-Host "🌐 Acceso web: /recursos/catequesis" -ForegroundColor Cyan