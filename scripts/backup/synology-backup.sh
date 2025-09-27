#!/bin/bash
# Script de Backup Automático para Synology DSM 7.1
# Sistema de Catequesis - Backup de volúmenes Docker
# 
# Este script realiza backup de los datos modificables del sistema:
# - /data/content (sesiones de catequesis)
# - /data/auth (datos de autenticación)  
# - /data/logs (logs de auditoría)
#
# Uso: ./synology-backup.sh [--compress] [--encrypt]

set -euo pipefail

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/volume1/docker/catequesis"
BACKUP_BASE_DIR="/volume1/backups/catequesis"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="catequesis_$DATE"
LOG_FILE="$BACKUP_BASE_DIR/backup.log"

# Opciones
COMPRESS=false
ENCRYPT=false

# Procesar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --compress)
            COMPRESS=true
            shift
            ;;
        --encrypt)
            ENCRYPT=true
            shift
            ;;
        -h|--help)
            echo "Uso: $0 [--compress] [--encrypt]"
            echo "  --compress  Comprimir el backup con gzip"
            echo "  --encrypt   Cifrar el backup con GPG"
            exit 0
            ;;
        *)
            echo "Opción desconocida: $1"
            exit 1
            ;;
    esac
done

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función de limpieza en caso de error
cleanup() {
    if [[ -d "$BACKUP_BASE_DIR/temp_$DATE" ]]; then
        rm -rf "$BACKUP_BASE_DIR/temp_$DATE"
        log "Limpieza de archivos temporales completada"
    fi
}

# Configurar trap para limpieza
trap cleanup EXIT

# Verificar que el proyecto existe
if [[ ! -d "$PROJECT_DIR" ]]; then
    log "ERROR: Directorio del proyecto no encontrado: $PROJECT_DIR"
    exit 1
fi

# Crear directorio de backups
mkdir -p "$BACKUP_BASE_DIR"
chmod 750 "$BACKUP_BASE_DIR"

log "=== Iniciando backup de Sistema de Catequesis ==="
log "Proyecto: $PROJECT_DIR"
log "Destino: $BACKUP_BASE_DIR"
log "Backup: $BACKUP_NAME"

# Crear directorio temporal
TEMP_DIR="$BACKUP_BASE_DIR/temp_$DATE"
mkdir -p "$TEMP_DIR"

# Verificar espacio disponible
AVAILABLE_SPACE=$(df "$BACKUP_BASE_DIR" | awk 'NR==2 {print $4}')
REQUIRED_SPACE=$(du -s "$PROJECT_DIR/data" | awk '{print $1 * 2}') # x2 para compresión

if [[ $AVAILABLE_SPACE -lt $REQUIRED_SPACE ]]; then
    log "ERROR: Espacio insuficiente. Disponible: ${AVAILABLE_SPACE}KB, Requerido: ${REQUIRED_SPACE}KB"
    exit 1
fi

log "Espacio verificado: ${AVAILABLE_SPACE}KB disponible, ${REQUIRED_SPACE}KB requerido"

# Realizar backup con rsync
log "Iniciando copia de archivos..."

# Backup de contenido (sesiones de catequesis)
if [[ -d "$PROJECT_DIR/data/content" ]]; then
    log "Copiando contenido de sesiones..."
    rsync -av --delete \
        --exclude='*.tmp' \
        --exclude='*.lock' \
        --exclude='.DS_Store' \
        "$PROJECT_DIR/data/content/" \
        "$TEMP_DIR/content/"
    log "✓ Contenido copiado: $(du -sh "$TEMP_DIR/content" | cut -f1)"
else
    log "ADVERTENCIA: No se encontró directorio de contenido"
fi

# Backup de autenticación
if [[ -d "$PROJECT_DIR/data/auth" ]]; then
    log "Copiando datos de autenticación..."
    rsync -av --delete \
        "$PROJECT_DIR/data/auth/" \
        "$TEMP_DIR/auth/"
    log "✓ Autenticación copiada: $(du -sh "$TEMP_DIR/auth" | cut -f1)"
else
    log "ADVERTENCIA: No se encontró directorio de autenticación"
fi

# Backup de logs
if [[ -d "$PROJECT_DIR/data/logs" ]]; then
    log "Copiando logs de auditoría..."
    rsync -av --delete \
        --exclude='*.tmp' \
        "$PROJECT_DIR/data/logs/" \
        "$TEMP_DIR/logs/"
    log "✓ Logs copiados: $(du -sh "$TEMP_DIR/logs" | cut -f1)"
else
    log "ADVERTENCIA: No se encontró directorio de logs"
fi

# Crear archivo de metadatos
cat > "$TEMP_DIR/backup_info.txt" << EOF
Backup del Sistema de Catequesis
================================
Fecha: $(date)
Servidor: $(hostname)
Usuario: $(whoami)
Versión Docker: $(docker --version 2>/dev/null || echo "No disponible")
Directorio origen: $PROJECT_DIR
Contenido incluido:
- Sesiones de catequesis (/data/content)
- Datos de autenticación (/data/auth)
- Logs de auditoría (/data/logs)

Archivos excluidos:
- .env (contiene secretos)
- Archivos temporales (*.tmp, *.lock)
- Archivos del sistema (.DS_Store)
EOF

log "✓ Metadatos del backup creados"

# Comprimir si se solicita
FINAL_BACKUP="$BACKUP_BASE_DIR/$BACKUP_NAME"
if [[ "$COMPRESS" == true ]]; then
    log "Comprimiendo backup..."
    tar -czf "$FINAL_BACKUP.tar.gz" -C "$BACKUP_BASE_DIR" "temp_$DATE"
    FINAL_BACKUP="$FINAL_BACKUP.tar.gz"
    log "✓ Backup comprimido: $(du -sh "$FINAL_BACKUP" | cut -f1)"
else
    mv "$TEMP_DIR" "$FINAL_BACKUP"
    log "✓ Backup creado: $(du -sh "$FINAL_BACKUP" | cut -f1)"
fi

# Cifrar si se solicita
if [[ "$ENCRYPT" == true ]]; then
    if command -v gpg &> /dev/null; then
        log "Cifrando backup..."
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
            --s2k-digest-algo SHA512 --s2k-count 65011712 \
            --output "$FINAL_BACKUP.gpg" "$FINAL_BACKUP"
        
        # Eliminar archivo sin cifrar
        rm "$FINAL_BACKUP"
        FINAL_BACKUP="$FINAL_BACKUP.gpg"
        log "✓ Backup cifrado: $(du -sh "$FINAL_BACKUP" | cut -f1)"
    else
        log "ADVERTENCIA: GPG no disponible, omitiendo cifrado"
    fi
fi

# Limpiar backups antiguos (mantener últimos 10)
log "Limpiando backups antiguos..."
find "$BACKUP_BASE_DIR" -name "catequesis_*" -type f \( -name "*.tar.gz" -o -name "*.gpg" \) -o -type d -name "catequesis_*" | \
    sort -r | tail -n +11 | while read -r old_backup; do
    if [[ -f "$old_backup" ]] || [[ -d "$old_backup" ]]; then
        rm -rf "$old_backup"
        log "Eliminado backup antiguo: $(basename "$old_backup")"
    fi
done

# Verificar integridad del backup
if [[ "$COMPRESS" == true && "$ENCRYPT" == false ]]; then
    if tar -tzf "$FINAL_BACKUP" >/dev/null 2>&1; then
        log "✓ Integridad del backup verificada"
    else
        log "ERROR: El backup está corrupto"
        exit 1
    fi
fi

# Estadísticas finales
BACKUP_SIZE=$(du -sh "$FINAL_BACKUP" | cut -f1)
TOTAL_FILES=$(find "$FINAL_BACKUP" -type f 2>/dev/null | wc -l || echo "N/A")

log "=== Backup completado exitosamente ==="
log "Archivo: $(basename "$FINAL_BACKUP")"
log "Tamaño: $BACKUP_SIZE"
log "Archivos: $TOTAL_FILES"
log "Ubicación: $FINAL_BACKUP"

# Enviar notificación (opcional)
if command -v synodsmnotify &> /dev/null; then
    synodsmnotify @administrators "Sistema de Catequesis" "Backup completado: $BACKUP_NAME ($BACKUP_SIZE)"
fi

log "Backup finalizado correctamente"