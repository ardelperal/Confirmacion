#!/bin/bash
# Script de Restauración para Synology DSM 7.1
# Sistema de Catequesis - Restauración de volúmenes Docker
#
# Este script restaura los datos del sistema desde un backup:
# - /data/content (sesiones de catequesis)
# - /data/auth (datos de autenticación)  
# - /data/logs (logs de auditoría)
#
# Uso: ./synology-restore.sh <archivo_backup> [--force]

set -euo pipefail

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/volume1/docker/catequesis"
BACKUP_BASE_DIR="/volume1/backups/catequesis"
LOG_FILE="$BACKUP_BASE_DIR/restore.log"
DATE=$(date +%Y%m%d_%H%M%S)

# Opciones
FORCE=false
BACKUP_FILE=""

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función de ayuda
show_help() {
    cat << EOF
Uso: $0 <archivo_backup> [opciones]

Argumentos:
  archivo_backup    Ruta al archivo de backup a restaurar

Opciones:
  --force          Forzar restauración sin confirmación
  -h, --help       Mostrar esta ayuda

Ejemplos:
  $0 /volume1/backups/catequesis/catequesis_20240125_140000.tar.gz
  $0 catequesis_20240125_140000 --force
  $0 /volume1/backups/catequesis/catequesis_20240125_140000.gpg

Nota: El script detecta automáticamente si el backup está comprimido o cifrado.
EOF
}

# Procesar argumentos
if [[ $# -eq 0 ]]; then
    show_help
    exit 1
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            echo "Opción desconocida: $1"
            show_help
            exit 1
            ;;
        *)
            if [[ -z "$BACKUP_FILE" ]]; then
                BACKUP_FILE="$1"
            else
                echo "Error: Solo se puede especificar un archivo de backup"
                exit 1
            fi
            shift
            ;;
    esac
done

# Verificar que se especificó un archivo
if [[ -z "$BACKUP_FILE" ]]; then
    echo "Error: Debe especificar un archivo de backup"
    show_help
    exit 1
fi

# Función de limpieza
cleanup() {
    if [[ -d "/tmp/catequesis_restore_$DATE" ]]; then
        rm -rf "/tmp/catequesis_restore_$DATE"
        log "Limpieza de archivos temporales completada"
    fi
}

trap cleanup EXIT

# Crear directorio de logs si no existe
mkdir -p "$BACKUP_BASE_DIR"

log "=== Iniciando restauración de Sistema de Catequesis ==="

# Resolver ruta del archivo de backup
if [[ ! -f "$BACKUP_FILE" ]]; then
    # Intentar buscar en el directorio de backups
    if [[ -f "$BACKUP_BASE_DIR/$BACKUP_FILE" ]]; then
        BACKUP_FILE="$BACKUP_BASE_DIR/$BACKUP_FILE"
    elif [[ -f "$BACKUP_BASE_DIR/$BACKUP_FILE.tar.gz" ]]; then
        BACKUP_FILE="$BACKUP_BASE_DIR/$BACKUP_FILE.tar.gz"
    elif [[ -f "$BACKUP_BASE_DIR/$BACKUP_FILE.gpg" ]]; then
        BACKUP_FILE="$BACKUP_BASE_DIR/$BACKUP_FILE.gpg"
    else
        log "ERROR: Archivo de backup no encontrado: $BACKUP_FILE"
        exit 1
    fi
fi

log "Archivo de backup: $BACKUP_FILE"
log "Tamaño: $(du -sh "$BACKUP_FILE" | cut -f1)"

# Verificar que el proyecto existe
if [[ ! -d "$PROJECT_DIR" ]]; then
    log "ERROR: Directorio del proyecto no encontrado: $PROJECT_DIR"
    exit 1
fi

# Verificar si Docker está ejecutándose
if docker compose -f "$PROJECT_DIR/docker-compose.yml" ps | grep -q "Up"; then
    if [[ "$FORCE" != true ]]; then
        echo "ADVERTENCIA: Los contenedores Docker están ejecutándose."
        echo "Se recomienda detenerlos antes de la restauración."
        echo ""
        echo "¿Desea continuar? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log "Restauración cancelada por el usuario"
            exit 0
        fi
    fi
    
    log "Deteniendo contenedores Docker..."
    cd "$PROJECT_DIR"
    docker compose down
    log "✓ Contenedores detenidos"
fi

# Crear backup de los datos actuales
if [[ -d "$PROJECT_DIR/data" ]]; then
    CURRENT_BACKUP="$BACKUP_BASE_DIR/pre_restore_backup_$DATE"
    log "Creando backup de seguridad de los datos actuales..."
    cp -r "$PROJECT_DIR/data" "$CURRENT_BACKUP"
    log "✓ Backup de seguridad creado: $CURRENT_BACKUP"
fi

# Crear directorio temporal
TEMP_DIR="/tmp/catequesis_restore_$DATE"
mkdir -p "$TEMP_DIR"

# Detectar tipo de archivo y extraer
log "Extrayendo backup..."

if [[ "$BACKUP_FILE" == *.gpg ]]; then
    # Archivo cifrado
    log "Detectado archivo cifrado, solicitando contraseña..."
    if ! gpg --decrypt "$BACKUP_FILE" | tar -xz -C "$TEMP_DIR"; then
        log "ERROR: No se pudo descifrar o extraer el backup"
        exit 1
    fi
elif [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    # Archivo comprimido
    if ! tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"; then
        log "ERROR: No se pudo extraer el backup comprimido"
        exit 1
    fi
elif [[ -d "$BACKUP_FILE" ]]; then
    # Directorio sin comprimir
    cp -r "$BACKUP_FILE"/* "$TEMP_DIR/"
else
    log "ERROR: Formato de backup no reconocido"
    exit 1
fi

log "✓ Backup extraído correctamente"

# Buscar el directorio de datos en el backup
BACKUP_DATA_DIR=""
if [[ -d "$TEMP_DIR/content" ]]; then
    # Backup directo
    BACKUP_DATA_DIR="$TEMP_DIR"
elif [[ -d "$TEMP_DIR/temp_"*"/content" ]]; then
    # Backup con directorio temporal
    BACKUP_DATA_DIR=$(find "$TEMP_DIR" -name "temp_*" -type d | head -1)
else
    log "ERROR: No se encontró estructura de datos válida en el backup"
    exit 1
fi

log "Directorio de datos encontrado: $BACKUP_DATA_DIR"

# Verificar contenido del backup
if [[ -f "$BACKUP_DATA_DIR/backup_info.txt" ]]; then
    log "Información del backup:"
    cat "$BACKUP_DATA_DIR/backup_info.txt" | while read -r line; do
        log "  $line"
    done
fi

# Confirmar restauración
if [[ "$FORCE" != true ]]; then
    echo ""
    echo "¿Confirma que desea restaurar este backup? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log "Restauración cancelada por el usuario"
        exit 0
    fi
fi

# Realizar restauración
log "Iniciando restauración de datos..."

# Crear directorio de datos si no existe
mkdir -p "$PROJECT_DIR/data"

# Restaurar contenido
if [[ -d "$BACKUP_DATA_DIR/content" ]]; then
    log "Restaurando contenido de sesiones..."
    rm -rf "$PROJECT_DIR/data/content"
    cp -r "$BACKUP_DATA_DIR/content" "$PROJECT_DIR/data/"
    log "✓ Contenido restaurado: $(du -sh "$PROJECT_DIR/data/content" | cut -f1)"
else
    log "ADVERTENCIA: No se encontró contenido en el backup"
fi

# Restaurar autenticación
if [[ -d "$BACKUP_DATA_DIR/auth" ]]; then
    log "Restaurando datos de autenticación..."
    rm -rf "$PROJECT_DIR/data/auth"
    cp -r "$BACKUP_DATA_DIR/auth" "$PROJECT_DIR/data/"
    log "✓ Autenticación restaurada: $(du -sh "$PROJECT_DIR/data/auth" | cut -f1)"
else
    log "ADVERTENCIA: No se encontraron datos de autenticación en el backup"
fi

# Restaurar logs
if [[ -d "$BACKUP_DATA_DIR/logs" ]]; then
    log "Restaurando logs de auditoría..."
    rm -rf "$PROJECT_DIR/data/logs"
    cp -r "$BACKUP_DATA_DIR/logs" "$PROJECT_DIR/data/"
    log "✓ Logs restaurados: $(du -sh "$PROJECT_DIR/data/logs" | cut -f1)"
else
    log "ADVERTENCIA: No se encontraron logs en el backup"
fi

# Restaurar permisos correctos
log "Aplicando permisos correctos..."
chown -R 1001:1001 "$PROJECT_DIR/data"
chmod -R 755 "$PROJECT_DIR/data"
log "✓ Permisos aplicados"

# Reiniciar contenedores
log "Reiniciando contenedores Docker..."
cd "$PROJECT_DIR"
docker compose up -d

# Esperar a que los servicios estén listos
log "Esperando a que los servicios estén listos..."
sleep 10

# Verificar estado de los contenedores
if docker compose ps | grep -q "Up"; then
    log "✓ Contenedores iniciados correctamente"
    
    # Verificar conectividad
    if curl -f -s http://localhost:8080/api/health >/dev/null 2>&1; then
        log "✓ Aplicación web respondiendo correctamente"
    else
        log "ADVERTENCIA: La aplicación web no responde, verificar logs"
    fi
else
    log "ERROR: Algunos contenedores no se iniciaron correctamente"
    docker compose ps
fi

# Estadísticas finales
RESTORED_SIZE=$(du -sh "$PROJECT_DIR/data" | cut -f1)
RESTORED_FILES=$(find "$PROJECT_DIR/data" -type f | wc -l)

log "=== Restauración completada ==="
log "Datos restaurados: $RESTORED_SIZE"
log "Archivos: $RESTORED_FILES"
log "Backup de seguridad: $CURRENT_BACKUP"

# Enviar notificación (opcional)
if command -v synodsmnotify &> /dev/null; then
    synodsmnotify @administrators "Sistema de Catequesis" "Restauración completada desde: $(basename "$BACKUP_FILE")"
fi

log "Restauración finalizada correctamente"
echo ""
echo "La restauración se ha completado. Puede acceder a la aplicación en:"
echo "http://$(hostname -I | awk '{print $1}'):8080"