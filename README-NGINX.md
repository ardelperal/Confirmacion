# 🌐 Configuración de Reverse Proxy

Esta documentación explica cómo configurar **Nginx** o **Caddy** como reverse proxy para la aplicación de Catequesis con SSL/TLS automático.

## 📋 Índice

- [Nginx (Recomendado)](#nginx-recomendado)
- [Caddy (Alternativa)](#caddy-alternativa)
- [Configuración SSL](#configuración-ssl)
- [Monitoreo y Logs](#monitoreo-y-logs)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Nginx (Recomendado)

### Características implementadas:

✅ **SSL/TLS con Let's Encrypt**  
✅ **Headers de seguridad completos**  
✅ **Compresión Gzip/Brotli**  
✅ **Rate limiting por IP**  
✅ **Cache para archivos estáticos**  
✅ **Protección adicional para /admin**  
✅ **Logs estructurados**  

### 🚀 Despliegue rápido

```bash
# 1. Configurar dominio y email
./scripts/setup-ssl.sh -d tu-dominio.com -e admin@tu-dominio.com

# 2. Actualizar configuración
sed -i 's/confirmacion.tu-dominio.com/tu-dominio.com/g' nginx/conf.d/confirmacion.conf

# 3. Levantar servicios
docker-compose -f docker-compose.nginx.yml up -d

# 4. Verificar
curl -I https://tu-dominio.com
```

### 📁 Estructura de archivos

```
nginx/
├── nginx.conf              # Configuración principal
├── conf.d/
│   └── confirmacion.conf   # Configuración del sitio
├── ssl/                    # Certificados SSL
├── logs/                   # Logs de acceso y error
└── renew-ssl.sh           # Script de renovación
```

### ⚙️ Configuración personalizada

#### Cambiar límites de rate limiting:

```nginx
# En nginx/conf.d/confirmacion.conf
limit_req_zone $binary_remote_addr zone:req_limit_per_ip:10m rate=20r/s;  # Más permisivo
limit_req zone=req_limit_per_ip burst=50 nodelay;
```

#### Habilitar Brotli (si tienes el módulo):

```nginx
# Descomentar en nginx/conf.d/confirmacion.conf
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/json application/javascript;
```

#### Configurar cache más agresivo:

```nginx
# Para archivos estáticos
expires 1y;
add_header Cache-Control "public, immutable";
```

---

## 🎯 Caddy (Alternativa)

### Ventajas de Caddy:

✅ **SSL automático sin configuración**  
✅ **HTTP/3 nativo**  
✅ **Configuración más simple**  
✅ **Renovación automática de certificados**  

### 🚀 Despliegue con Caddy

```bash
# 1. Actualizar dominio en Caddyfile
sed -i 's/confirmacion.tu-dominio.com/tu-dominio.com/g' Caddyfile

# 2. Levantar servicios
docker-compose -f docker-compose.caddy.yml up -d

# 3. Verificar
curl -I https://tu-dominio.com
```

### 📝 Configuración personalizada de Caddy

#### Rate limiting más estricto:

```caddyfile
rate_limit {
    zone general {
        key {remote_host}
        events 50        # Reducir de 100 a 50
        window 1m
    }
}
```

#### Habilitar logging detallado:

```caddyfile
log {
    output file /var/log/caddy/access.log
    format json
    level DEBUG
}
```

---

## 🔐 Configuración SSL

### Método 1: Script automático (Nginx)

```bash
# Configuración completa
./scripts/setup-ssl.sh -d midominio.com -e admin@midominio.com

# Solo prueba (dry-run)
./scripts/setup-ssl.sh --dry-run

# Forzar renovación
./scripts/setup-ssl.sh --force
```

### Método 2: Manual con Certbot

```bash
# Obtener certificados
docker run --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot-webroot:/var/www/certbot \
  certbot/certbot:latest \
  certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@tu-dominio.com \
  --agree-tos --no-eff-email \
  -d tu-dominio.com -d www.tu-dominio.com
```

### Renovación automática

```bash
# Agregar a crontab
crontab -e

# Renovar cada día a las 12:00
0 12 * * * /ruta/al/proyecto/nginx/renew-ssl.sh >> /ruta/al/proyecto/nginx/logs/renewal.log 2>&1
```

---

## 📊 Monitoreo y Logs

### Logs de Nginx

```bash
# Logs en tiempo real
docker-compose -f docker-compose.nginx.yml logs -f nginx

# Logs de acceso
tail -f nginx/logs/confirmacion_access.log

# Logs de error
tail -f nginx/logs/confirmacion_error.log

# Análisis de logs con goaccess (opcional)
docker run --rm -v $(pwd)/nginx/logs:/logs allinurl/goaccess \
  /logs/confirmacion_access.log -o /logs/report.html --log-format=COMBINED
```

### Logs de Caddy

```bash
# Logs en tiempo real
docker-compose -f docker-compose.caddy.yml logs -f caddy

# Logs estructurados
tail -f caddy/logs/confirmacion.log | jq '.'
```

### Métricas de rendimiento

```bash
# Verificar headers de seguridad
curl -I https://tu-dominio.com

# Test de SSL
docker run --rm ssllabs/ssllabs-scan --host=tu-dominio.com

# Test de velocidad
curl -w "@curl-format.txt" -o /dev/null -s https://tu-dominio.com
```

---

## 🔧 Troubleshooting

### Problemas comunes

#### 1. Error 502 Bad Gateway

```bash
# Verificar que la app esté corriendo
docker-compose ps

# Verificar conectividad
docker exec confirmacion-nginx curl -f http://web:3001/api/health

# Revisar logs
docker-compose logs web
```

#### 2. Certificados SSL no funcionan

```bash
# Verificar certificados
openssl x509 -in nginx/ssl/live/tu-dominio.com/fullchain.pem -text -noout

# Renovar manualmente
./nginx/renew-ssl.sh

# Verificar configuración de Nginx
docker exec confirmacion-nginx nginx -t
```

#### 3. Rate limiting muy estricto

```bash
# Verificar logs de rate limiting
grep "limiting requests" nginx/logs/confirmacion_error.log

# Ajustar en nginx/conf.d/confirmacion.conf
limit_req_zone $binary_remote_addr zone:req_limit_per_ip:10m rate=20r/s;
```

#### 4. Headers de seguridad causan problemas

```nginx
# Relajar CSP temporalmente
add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:;" always;

# Permitir iframes de mismo origen
add_header X-Frame-Options "SAMEORIGIN" always;
```

### Comandos útiles

```bash
# Recargar configuración de Nginx
docker exec confirmacion-nginx nginx -s reload

# Verificar configuración
docker exec confirmacion-nginx nginx -t

# Ver procesos de Nginx
docker exec confirmacion-nginx ps aux

# Verificar puertos
docker exec confirmacion-nginx netstat -tlnp

# Test de conectividad interna
docker exec confirmacion-nginx curl -f http://web:3001
```

---

## 🔒 Configuración de seguridad avanzada

### Fail2Ban (opcional)

```bash
# Instalar fail2ban en el host
sudo apt install fail2ban

# Configurar jail para Nginx
sudo tee /etc/fail2ban/jail.d/nginx.conf << EOF
[nginx-req-limit]
enabled = true
filter = nginx-req-limit
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = $(pwd)/nginx/logs/confirmacion_error.log
findtime = 600
bantime = 7200
maxretry = 10
EOF
```

### Monitoreo con Prometheus (opcional)

```yaml
# Agregar a docker-compose
  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:latest
    ports:
      - "9113:9113"
    command:
      - -nginx.scrape-uri=http://nginx:8080/nginx_status
```

---

## 📚 Referencias

- [Nginx Security Headers](https://securityheaders.com/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)

---

## 🆘 Soporte

Si encuentras problemas:

1. **Revisa los logs** primero
2. **Verifica la configuración** con `nginx -t`
3. **Consulta la documentación** oficial
4. **Abre un issue** con logs detallados