#!/bin/bash

# Script de instalación automática para backups en Synology DSM 7.1
# Sistema de Catequesis - Configuración de Backup Automático

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKUP_DIR="/volume1/backups/catequesis"
CRON_BACKUP_TIME="0 2 * * *"  # 2:00 AM diario
CRON_WEEKLY_TIME="0 3 * * 0"  # 3:00 AM domingos

# Funciones de utilidad
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si se ejecuta en Synology
check_synology() {
    if [[ ! -f /etc/synoinfo.conf ]]; then
        log_error "Este script debe ejecutarse en un NAS Synology con DSM 7.1"
        exit 1
    fi
    
    local dsm_version=$(grep -o 'majorversion="[0-9]*"' /etc/synoinfo.conf | cut -d'"' -f2)
    if [[ "$dsm_version" != "7" ]]; then
        log_warning "DSM version detectada: $dsm_version. Este script está optimizado para DSM 7.1"
    fi
    
    log_success "Synology DSM detectado correctamente"
}

# Verificar permisos de administrador
check_permissions() {
    if [[ $EUID -ne 0 ]] && ! groups | grep -q "administrators"; then
        log_error "Este script requiere permisos de administrador"
        log_info "Ejecutar como: sudo $0 o con usuario del grupo administrators"
        exit 1
    fi
    log_success "Permisos verificados"
}

# Crear estructura de directorios
create_directories() {
    log_info "Creando estructura de directorios..."
    
    # Directorio principal de backups
    if [[ ! -d "$BACKUP_DIR" ]]; then
        sudo mkdir -p "$BACKUP_DIR"
        sudo chown admin:users "$BACKUP_DIR"
        sudo chmod 750 "$BACKUP_DIR"
        log_success "Directorio de backups creado: $BACKUP_DIR"
    else
        log_info "Directorio de backups ya existe: $BACKUP_DIR"
    fi
    
    # Verificar directorios de datos del proyecto
    local data_dirs=("$PROJECT_DIR/data/content" "$PROJECT_DIR/data/auth" "$PROJECT_DIR/data/logs")
    for dir in "${data_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            log_warning "Directorio de datos no encontrado: $dir"
            log_info "Creando directorio..."
            mkdir -p "$dir"
            chmod 755 "$dir"
        fi
    done
    
    log_success "Estructura de directorios verificada"
}

# Configurar permisos de scripts
setup_script_permissions() {
    log_info "Configurando permisos de scripts..."
    
    local scripts=("synology-backup.sh" "synology-restore.sh")
    for script in "${scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        if [[ -f "$script_path" ]]; then
            chmod +x "$script_path"
            log_success "Permisos configurados para: $script"
        else
            log_error "Script no encontrado: $script_path"
            exit 1
        fi
    done
}

# Probar backup manual
test_backup() {
    log_info "Ejecutando prueba de backup..."
    
    if "$SCRIPT_DIR/synology-backup.sh" --compress; then
        log_success "Prueba de backup completada exitosamente"
        
        # Verificar que se creó el archivo
        local latest_backup=$(ls -t "$BACKUP_DIR"/catequesis_*.tar.gz 2>/dev/null | head -1)
        if [[ -n "$latest_backup" ]]; then
            local backup_size=$(du -sh "$latest_backup" | cut -f1)
            log_success "Backup creado: $(basename "$latest_backup") (Tamaño: $backup_size)"
        fi
    else
        log_error "La prueba de backup falló"
        return 1
    fi
}

# Configurar cron jobs
setup_cron() {
    log_info "Configurando tareas programadas (cron)..."
    
    # Backup del crontab actual
    crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Obtener crontab actual
    local current_cron=$(crontab -l 2>/dev/null || echo "")
    
    # Verificar si ya existen entradas para catequesis
    if echo "$current_cron" | grep -q "catequesis.*backup"; then
        log_warning "Ya existen tareas de backup programadas para catequesis"
        read -p "¿Desea reemplazarlas? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Manteniendo configuración de cron existente"
            return 0
        fi
        
        # Remover entradas existentes
        current_cron=$(echo "$current_cron" | grep -v "catequesis.*backup" || true)
    fi
    
    # Agregar nuevas entradas
    local new_cron="$current_cron"
    
    # Backup diario comprimido
    new_cron="$new_cron
# Catequesis - Backup diario comprimido (2:00 AM)
$CRON_BACKUP_TIME $SCRIPT_DIR/synology-backup.sh --compress"
    
    # Backup semanal cifrado
    new_cron="$new_cron
# Catequesis - Backup semanal cifrado (Domingos 3:00 AM)
$CRON_WEEKLY_TIME $SCRIPT_DIR/synology-backup.sh --compress --encrypt"
    
    # Aplicar nuevo crontab
    echo "$new_cron" | crontab -
    
    log_success "Tareas de backup programadas:"
    log_info "  - Backup diario comprimido: $CRON_BACKUP_TIME"
    log_info "  - Backup semanal cifrado: $CRON_WEEKLY_TIME"
}

# Configurar notificaciones DSM (opcional)
setup_notifications() {
    log_info "Configurando notificaciones DSM..."
    
    # Verificar si synonotify está disponible
    if command -v synonotify >/dev/null 2>&1; then
        log_success "Sistema de notificaciones DSM disponible"
        log_info "Las notificaciones se enviarán automáticamente en caso de errores"
    else
        log_warning "Sistema de notificaciones DSM no disponible"
        log_info "Los logs estarán disponibles en: $BACKUP_DIR/backup.log"
    fi
}

# Mostrar resumen de configuración
show_summary() {
    echo
    log_success "=== INSTALACIÓN COMPLETADA ==="
    echo
    log_info "Configuración de Backup para Sistema de Catequesis:"
    echo
    echo "📁 Directorio de backups: $BACKUP_DIR"
    echo "📄 Scripts instalados:"
    echo "   - $SCRIPT_DIR/synology-backup.sh"
    echo "   - $SCRIPT_DIR/synology-restore.sh"
    echo
    echo "⏰ Programación automática:"
    echo "   - Backup diario: $CRON_BACKUP_TIME (comprimido)"
    echo "   - Backup semanal: $CRON_WEEKLY_TIME (comprimido + cifrado)"
    echo
    echo "📊 Datos respaldados:"
    echo "   - $PROJECT_DIR/data/content/ (sesiones)"
    echo "   - $PROJECT_DIR/data/auth/ (autenticación)"
    echo "   - $PROJECT_DIR/data/logs/ (logs)"
    echo
    echo "🔧 Comandos útiles:"
    echo "   - Backup manual: $SCRIPT_DIR/synology-backup.sh"
    echo "   - Ver backups: ls -la $BACKUP_DIR/"
    echo "   - Ver logs: tail -f $BACKUP_DIR/backup.log"
    echo "   - Ver cron: crontab -l"
    echo
    echo "📖 Documentación completa: $SCRIPT_DIR/README.md"
    echo
}

# Función principal
main() {
    echo
    log_info "=== INSTALADOR DE BACKUP AUTOMÁTICO ==="
    log_info "Sistema de Catequesis - Synology DSM 7.1"
    echo
    
    # Verificaciones previas
    check_synology
    check_permissions
    
    # Configuración
    create_directories
    setup_script_permissions
    
    # Prueba inicial
    if ! test_backup; then
        log_error "La instalación falló en la prueba de backup"
        exit 1
    fi
    
    # Configuración automática
    setup_cron
    setup_notifications
    
    # Resumen final
    show_summary
    
    log_success "¡Instalación completada exitosamente!"
    log_info "El sistema de backup automático está ahora configurado y funcionando"
}

# Manejo de señales
trap 'log_error "Instalación interrumpida"; exit 1' INT TERM

# Ejecutar función principal
main "$@"