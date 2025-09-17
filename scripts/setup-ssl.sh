#!/bin/bash
# Script para configurar SSL con Let's Encrypt
# Archivo: scripts/setup-ssl.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
DOMAIN="confirmacion.tu-dominio.com"
EMAIL="admin@tu-dominio.com"
WEBROOT="/var/www/certbot"

echo -e "${GREEN}🔒 Configurando SSL con Let's Encrypt${NC}"
echo "Dominio: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  -d, --domain DOMAIN    Dominio principal (default: $DOMAIN)"
    echo "  -e, --email EMAIL      Email para Let's Encrypt (default: $EMAIL)"
    echo "  -w, --webroot PATH     Path del webroot (default: $WEBROOT)"
    echo "  --dry-run             Ejecutar en modo de prueba"
    echo "  --force               Forzar renovación de certificados"
    echo "  -h, --help            Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 -d midominio.com -e admin@midominio.com"
    echo "  $0 --dry-run"
    echo "  $0 --force"
}

# Parsear argumentos
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -w|--webroot)
            WEBROOT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Opción desconocida: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validar que el dominio no sea el ejemplo
if [[ "$DOMAIN" == "confirmacion.tu-dominio.com" ]]; then
    echo -e "${RED}❌ Error: Debes cambiar el dominio por defecto${NC}"
    echo "Usa: $0 -d tu-dominio-real.com -e tu-email@real.com"
    exit 1
fi

# Crear directorios necesarios
echo -e "${YELLOW}📁 Creando directorios...${NC}"
mkdir -p nginx/ssl
mkdir -p nginx/certbot-webroot
mkdir -p nginx/logs

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker no está corriendo${NC}"
    exit 1
fi

# Función para obtener certificados
obtain_certificates() {
    local cmd_args=""
    
    if [[ "$DRY_RUN" == "true" ]]; then
        cmd_args="--dry-run"
        echo -e "${YELLOW}🧪 Ejecutando en modo de prueba...${NC}"
    fi
    
    if [[ "$FORCE" == "true" ]]; then
        cmd_args="$cmd_args --force-renewal"
        echo -e "${YELLOW}🔄 Forzando renovación...${NC}"
    fi
    
    echo -e "${YELLOW}🔐 Obteniendo certificados SSL...${NC}"
    
    docker run --rm \
        -v "$(pwd)/nginx/ssl:/etc/letsencrypt" \
        -v "$(pwd)/nginx/certbot-webroot:/var/www/certbot" \
        certbot/certbot:latest \
        certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        $cmd_args
}

# Función para configurar renovación automática
setup_auto_renewal() {
    echo -e "${YELLOW}⏰ Configurando renovación automática...${NC}"
    
    # Crear script de renovación
    cat > nginx/renew-ssl.sh << 'EOF'
#!/bin/bash
# Script de renovación automática de SSL

cd "$(dirname "$0")/.."

echo "$(date): Iniciando renovación de certificados SSL..."

# Renovar certificados
docker run --rm \
    -v "$(pwd)/nginx/ssl:/etc/letsencrypt" \
    -v "$(pwd)/nginx/certbot-webroot:/var/www/certbot" \
    certbot/certbot:latest \
    renew --quiet

# Recargar Nginx si hay cambios
if docker ps --format "table {{.Names}}" | grep -q "confirmacion-nginx"; then
    echo "$(date): Recargando configuración de Nginx..."
    docker exec confirmacion-nginx nginx -s reload
fi

echo "$(date): Renovación completada"
EOF

    chmod +x nginx/renew-ssl.sh
    
    echo -e "${GREEN}✅ Script de renovación creado en nginx/renew-ssl.sh${NC}"
    echo -e "${YELLOW}💡 Para configurar cron job:${NC}"
    echo "0 12 * * * $(pwd)/nginx/renew-ssl.sh >> $(pwd)/nginx/logs/renewal.log 2>&1"
}

# Función para verificar certificados
verify_certificates() {
    echo -e "${YELLOW}🔍 Verificando certificados...${NC}"
    
    if [[ -f "nginx/ssl/live/$DOMAIN/fullchain.pem" ]]; then
        echo -e "${GREEN}✅ Certificado encontrado${NC}"
        
        # Mostrar información del certificado
        openssl x509 -in "nginx/ssl/live/$DOMAIN/fullchain.pem" -text -noout | grep -E "(Subject:|Not After :|DNS:)" || true
        
        return 0
    else
        echo -e "${RED}❌ Certificado no encontrado${NC}"
        return 1
    fi
}

# Función principal
main() {
    echo -e "${GREEN}🚀 Iniciando configuración SSL...${NC}"
    
    # Obtener certificados
    if obtain_certificates; then
        echo -e "${GREEN}✅ Certificados obtenidos exitosamente${NC}"
        
        # Verificar certificados
        if verify_certificates; then
            # Configurar renovación automática
            setup_auto_renewal
            
            echo ""
            echo -e "${GREEN}🎉 ¡Configuración SSL completada!${NC}"
            echo ""
            echo -e "${YELLOW}📋 Próximos pasos:${NC}"
            echo "1. Actualizar el dominio en nginx/conf.d/confirmacion.conf"
            echo "2. Ejecutar: docker-compose -f docker-compose.nginx.yml up -d"
            echo "3. Configurar cron job para renovación automática"
            echo ""
            echo -e "${YELLOW}🔗 URLs de prueba:${NC}"
            echo "- https://$DOMAIN"
            echo "- https://www.$DOMAIN"
            
        else
            echo -e "${RED}❌ Error al verificar certificados${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Error al obtener certificados${NC}"
        exit 1
    fi
}

# Ejecutar función principal
main