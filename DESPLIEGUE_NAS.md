# Despliegue en NAS con Docker

Guía completa para desplegar la aplicación de Catequesis en un NAS usando Docker.

## Requisitos Previos

- NAS con Docker instalado
- Acceso SSH al NAS
- Git instalado en el NAS
- Puertos 8080 y 3001 disponibles

## Configuración Inicial

### 1. Clonar el Repositorio

```bash
# En el NAS, navegar al directorio deseado
cd /volume1/docker/
git clone <URL_DEL_REPOSITORIO> catequesis
cd catequesis
```

### 2. Configurar Variables de Entorno

```bash
# Editar el archivo .env
nano .env
```

**Configuración obligatoria:**
- `ADMIN_PASSWORD`: Cambiar por una contraseña fuerte
- `BASE_URL`: Cambiar `<IP_NAS>` por la IP real del NAS
- `JWT_SECRET`: Cambiar por un valor único y seguro

**Ejemplo:**
```env
ADMIN_PASSWORD=MiPasswordSuperSegura2024!
BASE_URL=http://192.168.1.100:8080
JWT_SECRET=mi-clave-jwt-super-secreta-para-nas-2024
```

### 3. Configurar Permisos

```bash
# Crear directorio de contenido si no existe
mkdir -p ./data/content

# Asegurar permisos correctos (UID 1001 del contenedor)
sudo chown -R 1001:1001 ./data/content
sudo chmod -R 755 ./data/content
```

## Despliegue

### 1. Construir y Ejecutar

```bash
# Construir las imágenes
docker compose build

# Ejecutar en segundo plano
docker compose up -d
```

### 2. Verificar Estado

```bash
# Verificar que los contenedores están ejecutándose
docker compose ps

# Ver logs si hay problemas
docker compose logs web
docker compose logs gotenberg
```

### 3. Acceso a la Aplicación

- **URL pública:** `http://<IP_NAS>:8080/`
- **Panel admin:** `http://<IP_NAS>:8080/login`
- **Gotenberg:** `http://<IP_NAS>:3001/` (interno)

## Operación

### Flujo de Trabajo Típico

1. **Acceder al admin:**
   ```
   http://<IP_NAS>:8080/login
   → Introducir ADMIN_PASSWORD
   ```

2. **Crear/editar sesiones:**
   ```
   http://<IP_NAS>:8080/admin
   → Crear nueva sesión (ej: A1)
   → Editar contenido
   → Guardar (queda como draft)
   ```

3. **Publicar sesiones:**
   ```
   En el admin → Cambiar status a "published"
   → La sesión aparece en la vista pública
   ```

4. **Vista pública:**
   ```
   http://<IP_NAS>:8080/
   → Solo muestra sesiones "published"
   → Descargas PDF/DOCX disponibles
   ```

### Modo Solo Lectura

Para temporadas cerradas:

```bash
# Editar .env
nano .env
# Cambiar: READ_ONLY=true

# Reiniciar
docker compose restart web
```

**Efectos del modo solo lectura:**
- Oculta `/admin` y `/login`
- Bloquea todas las rutas `/api/admin/**`
- Mantiene visible todo el contenido público
- Permite descargas PDF/DOCX

## Mantenimiento

### Actualizaciones

```bash
# Actualizar código
git pull

# Reconstruir sin caché
docker compose build --no-cache

# Reiniciar servicios
docker compose up -d
```

### Backups

**Configurar cron en el NAS:**

```bash
# Editar crontab
crontab -e

# Backup diario a las 2:00 AM
0 2 * * * /usr/bin/rsync -av /volume1/docker/catequesis/data/content/ /volume1/backups/catequesis/content-$(date +\%Y\%m\%d)/

# Backup del log de auditoría
0 2 * * * cp /volume1/docker/catequesis/data/content/.audit.log /volume1/backups/catequesis/audit-$(date +\%Y\%m\%d).log
```

**Backup manual:**

```bash
# Backup completo
tar -czf catequesis-backup-$(date +%Y%m%d).tar.gz ./data/content/

# Restaurar backup
tar -xzf catequesis-backup-YYYYMMDD.tar.gz
sudo chown -R 1001:1001 ./data/content
```

### Logs y Monitoreo

```bash
# Ver logs en tiempo real
docker compose logs -f web

# Ver logs de errores
docker compose logs web | grep ERROR

# Verificar uso de recursos
docker stats
```

## Resolución de Problemas

### Problemas Comunes

**1. Error de permisos en /app/content:**
```bash
sudo chown -R 1001:1001 ./data/content
sudo chmod -R 755 ./data/content
docker compose restart web
```

**2. Gotenberg no responde:**
```bash
# Verificar estado
docker compose ps gotenberg

# Reiniciar solo Gotenberg
docker compose restart gotenberg

# Si persiste, las exportaciones DOCX seguirán funcionando
```

**3. Sesiones no aparecen:**
- Verificar que el status sea "published"
- Comprobar que READ_ONLY=false para edición
- Revisar logs: `docker compose logs web`

**4. Error 503 en PDF:**
- Gotenberg está caído
- Las exportaciones DOCX siguen funcionando
- Reiniciar: `docker compose restart gotenberg`

### Verificación de Funcionalidad (QA)

**Test 1: Visibilidad de sesiones**
```bash
# Sin login: B1 en draft no debe aparecer
curl http://<IP_NAS>:8080/ | grep "B1"

# Publicar B1 desde admin, debe aparecer
# Cambiar a draft, debe desaparecer
```

**Test 2: Descargas por rol**
```bash
# Público: solo PDF/DOCX
curl -I http://<IP_NAS>:8080/api/export/pdf/a1
curl -I http://<IP_NAS>:8080/api/export/docx/a1

# Admin puede descargar MD (requiere autenticación)
```

**Test 3: Pagebreaks en PDF**
```bash
# Descargar PDF y verificar saltos de página
curl http://<IP_NAS>:8080/api/export/pdf/a1 -o test.pdf
# Abrir test.pdf y verificar que respeta ---pagebreak---
```

## Seguridad

### Recomendaciones

1. **Contraseñas fuertes:** Usar generador de contraseñas
2. **Firewall:** Restringir acceso a puertos 8080/3001 si es necesario
3. **HTTPS:** Configurar reverse proxy con SSL en el NAS
4. **Backups:** Automatizar y verificar regularmente
5. **Actualizaciones:** Mantener Docker y la aplicación actualizados

### Configuración HTTPS (Opcional)

Si el NAS tiene reverse proxy:

```nginx
# Configuración Nginx en NAS
server {
    listen 443 ssl;
    server_name catequesis.miparroquia.org;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Actualizar `.env`:
```env
BASE_URL=https://catequesis.miparroquia.org
```

## Contacto y Soporte

Para problemas técnicos:
1. Revisar logs: `docker compose logs`
2. Verificar configuración: `.env` y permisos
3. Consultar esta documentación
4. Contactar al desarrollador con logs específicos