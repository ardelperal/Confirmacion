# Scripts de Backup para Synology DSM 7.1

Esta carpeta contiene scripts específicos para realizar backups y restauraciones del Sistema de Catequesis en un NAS Synology con DSM 7.1.

## Archivos Incluidos

- `synology-backup.sh` - Script principal de backup automático
- `synology-restore.sh` - Script de restauración desde backup
- `README.md` - Esta documentación

## Configuración Inicial

### 1. Permisos de Ejecución

```bash
# Conectar por SSH al NAS
ssh admin@IP_DEL_NAS

# Navegar al directorio de scripts
cd /volume1/docker/catequesis/scripts/backup

# Dar permisos de ejecución
chmod +x synology-backup.sh synology-restore.sh
```

### 2. Crear Directorio de Backups

```bash
# Crear directorio principal de backups
sudo mkdir -p /volume1/backups/catequesis
sudo chown admin:users /volume1/backups/catequesis
sudo chmod 750 /volume1/backups/catequesis
```

## Uso de Scripts

### Script de Backup (`synology-backup.sh`)

#### Backup Básico
```bash
./synology-backup.sh
```

#### Backup Comprimido
```bash
./synology-backup.sh --compress
```

#### Backup Cifrado
```bash
./synology-backup.sh --encrypt
```

#### Backup Comprimido y Cifrado
```bash
./synology-backup.sh --compress --encrypt
```

### Script de Restauración (`synology-restore.sh`)

#### Restaurar desde archivo específico
```bash
./synology-restore.sh /volume1/backups/catequesis/catequesis_20240125_140000.tar.gz
```

#### Restaurar sin confirmación
```bash
./synology-restore.sh catequesis_20240125_140000 --force
```

#### Restaurar desde backup cifrado
```bash
./synology-restore.sh catequesis_20240125_140000.gpg
```

## Programación Automática

### Configurar Cron para Backups Automáticos

```bash
# Editar crontab
crontab -e

# Backup diario a las 2:00 AM (comprimido)
0 2 * * * /volume1/docker/catequesis/scripts/backup/synology-backup.sh --compress

# Backup semanal cifrado los domingos a las 3:00 AM
0 3 * * 0 /volume1/docker/catequesis/scripts/backup/synology-backup.sh --compress --encrypt
```

### Verificar Cron
```bash
# Ver tareas programadas
crontab -l

# Ver logs de cron
tail -f /var/log/cron
```

## Datos Respaldados

Los scripts respaldan únicamente los **volúmenes Docker modificables**:

### Incluidos en el Backup
- `data/content/` - Sesiones de catequesis y configuración
- `data/auth/` - Datos de autenticación y tokens
- `data/logs/` - Logs de auditoría y acceso

### Excluidos del Backup
- `.env` - Variables de entorno (contienen secretos)
- `node_modules/` - Dependencias (se regeneran)
- Archivos temporales (`*.tmp`, `*.lock`)
- Archivos del sistema (`.DS_Store`)

## Características de los Scripts

### Script de Backup
- ✅ Verificación de espacio disponible
- ✅ Backup incremental con rsync
- ✅ Compresión opcional con gzip
- ✅ Cifrado opcional con GPG
- ✅ Limpieza automática (mantiene últimos 10 backups)
- ✅ Verificación de integridad
- ✅ Logging detallado
- ✅ Notificaciones DSM (si están disponibles)
- ✅ Manejo de errores y limpieza

### Script de Restauración
- ✅ Detección automática de formato (comprimido/cifrado)
- ✅ Backup de seguridad antes de restaurar
- ✅ Parada y reinicio automático de contenedores
- ✅ Verificación de integridad
- ✅ Restauración de permisos correctos
- ✅ Confirmación interactiva (opcional con --force)
- ✅ Verificación post-restauración

## Ubicaciones de Archivos

```
/volume1/docker/catequesis/
├── data/                          # Datos a respaldar
│   ├── content/                   # ← Sesiones de catequesis
│   ├── auth/                      # ← Datos de autenticación
│   └── logs/                      # ← Logs de auditoría
├── scripts/backup/
│   ├── synology-backup.sh         # Script de backup
│   ├── synology-restore.sh        # Script de restauración
│   └── README.md                  # Esta documentación
└── .env                           # ← NO incluido en backup

/volume1/backups/catequesis/
├── catequesis_20240125_140000.tar.gz
├── catequesis_20240124_020000.tar.gz
├── backup.log                     # Log de backups
└── restore.log                    # Log de restauraciones
```

## Monitoreo y Logs

### Ver Logs de Backup
```bash
tail -f /volume1/backups/catequesis/backup.log
```

### Ver Logs de Restauración
```bash
tail -f /volume1/backups/catequesis/restore.log
```

### Verificar Backups Existentes
```bash
ls -la /volume1/backups/catequesis/catequesis_*
```

### Verificar Tamaño de Backups
```bash
du -sh /volume1/backups/catequesis/catequesis_*
```

## Solución de Problemas

### Error: "Espacio insuficiente"
```bash
# Verificar espacio disponible
df -h /volume1/backups

# Limpiar backups antiguos manualmente
rm /volume1/backups/catequesis/catequesis_FECHA_MAS_ANTIGUA*
```

### Error: "Permisos denegados"
```bash
# Verificar permisos del directorio
ls -la /volume1/backups/catequesis/

# Corregir permisos
sudo chown -R admin:users /volume1/backups/catequesis/
sudo chmod -R 750 /volume1/backups/catequesis/
```

### Error: "GPG no disponible"
```bash
# Instalar GPG en Synology (opcional)
# O usar backup sin cifrado:
./synology-backup.sh --compress
```

### Contenedores no se reinician después de restauración
```bash
# Verificar estado
cd /volume1/docker/catequesis
docker compose ps

# Reiniciar manualmente
docker compose down
docker compose up -d

# Ver logs
docker compose logs web
```

## Seguridad

### Recomendaciones
1. **Cifrado**: Usar `--encrypt` para backups que contengan datos sensibles
2. **Permisos**: Mantener permisos restrictivos (750) en directorios de backup
3. **Ubicación**: Almacenar backups en volumen separado si es posible
4. **Rotación**: Los scripts mantienen automáticamente solo los últimos 10 backups
5. **Verificación**: Probar restauraciones periódicamente

### Backup Remoto (Opcional)
```bash
# Sincronizar backups a ubicación remota
rsync -av --delete /volume1/backups/catequesis/ usuario@servidor-remoto:/backups/catequesis/
```

## Contacto

Para problemas con los scripts de backup:
1. Revisar logs: `/volume1/backups/catequesis/backup.log`
2. Verificar permisos y espacio disponible
3. Consultar esta documentación
4. Contactar al administrador del sistema