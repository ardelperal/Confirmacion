#!/bin/bash

# Script de verificación para despliegue en NAS
# Ejecutar antes del primer despliegue

echo "=== Verificación de Configuración para NAS ==="
echo

# Verificar archivos necesarios
echo "1. Verificando archivos de configuración..."
files=("docker-compose.yml" ".env" "web/Dockerfile" "web/next.config.js")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file existe"
    else
        echo "✗ $file NO ENCONTRADO"
        exit 1
    fi
done
echo

# Verificar configuración de .env
echo "2. Verificando configuración .env..."
if grep -q "<IP_NAS>" .env; then
    echo "⚠️  ADVERTENCIA: Cambiar <IP_NAS> por la IP real del NAS en .env"
fi

if grep -q "CambiarPorPasswordSegura123!" .env; then
    echo "⚠️  ADVERTENCIA: Cambiar ADMIN_PASSWORD por una contraseña segura en .env"
fi

if grep -q "jwt-secret-key-muy-seguro-para-nas-2024" .env; then
    echo "⚠️  ADVERTENCIA: Cambiar JWT_SECRET por un valor único en .env"
fi
echo

# Verificar Next.js standalone
echo "3. Verificando configuración Next.js..."
if grep -q "output: 'standalone'" web/next.config.js; then
    echo "✓ Next.js configurado para standalone"
else
    echo "✗ Next.js NO configurado para standalone"
    exit 1
fi
echo

# Crear directorio de contenido
echo "4. Configurando directorios..."
mkdir -p ./data/content
echo "✓ Directorio ./data/content creado"
echo

# Verificar permisos (si se ejecuta como root)
if [ "$EUID" -eq 0 ]; then
    echo "5. Configurando permisos..."
    chown -R 1001:1001 ./data/content
    chmod -R 755 ./data/content
    echo "✓ Permisos configurados (UID 1001)"
else
    echo "5. Permisos..."
    echo "⚠️  Ejecutar como root para configurar permisos automáticamente:"
    echo "   sudo chown -R 1001:1001 ./data/content"
    echo "   sudo chmod -R 755 ./data/content"
fi
echo

# Verificar Docker
echo "6. Verificando Docker..."
if command -v docker &> /dev/null; then
    echo "✓ Docker instalado"
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        echo "✓ Docker Compose disponible"
    else
        echo "✗ Docker Compose NO disponible"
        exit 1
    fi
else
    echo "✗ Docker NO instalado"
    exit 1
fi
echo

# Verificar puertos
echo "7. Verificando puertos..."
ports=(8080 3001)
for port in "${ports[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo "⚠️  Puerto $port ya está en uso"
    else
        echo "✓ Puerto $port disponible"
    fi
done
echo

echo "=== Resumen ==="
echo "Si no hay errores (✗), puedes proceder con:"
echo "1. Editar .env con los valores correctos"
echo "2. docker compose build"
echo "3. docker compose up -d"
echo "4. Acceder a http://<IP_NAS>:8080/"
echo
echo "Para más detalles, consultar DESPLIEGUE_NAS.md"