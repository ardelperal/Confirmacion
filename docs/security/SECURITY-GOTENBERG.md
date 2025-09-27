# Configuración de Seguridad - Gotenberg

## Resumen

Este documento describe la configuración de seguridad implementada para el servicio Gotenberg en el proyecto de Catequesis, incluyendo el aislamiento de red, sanitización de contenido y límites de seguridad.

## Arquitectura de Seguridad

### 1. Aislamiento de Red

**Configuración en docker-compose.yml:**
```yaml
services:
  gotenberg:
    image: gotenberg/gotenberg:7
    # SIN puertos expuestos al host
    networks:
      - internal_net  # Solo red interna
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    command:
      - "gotenberg"
      - "--chromium-disable-web-security=false"  # Seguridad habilitada
      - "--chromium-disable-routes=true"         # Rutas deshabilitadas
      - "--api-timeout=20s"                      # Timeout de API

  web:
    networks:
      - catequesis-network  # Red externa para usuarios
      - internal_net        # Red interna para Gotenberg

networks:
  internal_net:
    driver: bridge
    internal: true  # Sin acceso a internet
```

**Beneficios:**
- Gotenberg NO es accesible desde el host (sin `ports:`)
- Solo el servicio web puede comunicarse con Gotenberg
- Red interna aislada sin acceso a internet
- Límites de recursos para prevenir DoS

### 2. Wrapper de Seguridad (lib/pdf.ts)

**Validaciones implementadas:**

#### Validación de Tamaño
```typescript
// Límite máximo: 1MB
const MAX_HTML_SIZE = 1024 * 1024;

function validateHtmlSize(html: string): void {
  const sizeInBytes = Buffer.byteLength(html, 'utf8');
  if (sizeInBytes > MAX_HTML_SIZE) {
    throw new Error('HTML content exceeds maximum size limit');
  }
}
```

#### Sanitización de HTML
```typescript
// Configuración DOMPurify
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'div', 'span', ...],
  FORBIDDEN_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?):\/\/|mailto:|tel:|#)/i
};
```

#### Timeout y Manejo de Errores
```typescript
// Timeout de 20 segundos
const REQUEST_TIMEOUT = 20000;

// Manejo seguro de errores (sin filtrar HTML original)
catch (error) {
  console.error('PDF generation failed:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    htmlLength: html.length,  // Solo longitud, no contenido
    timestamp: new Date().toISOString()
  });
  
  throw new Error('PDF generation failed');  // Mensaje genérico
}
```

### 3. Verificaciones de Salud

**Health Check:**
```typescript
export async function checkGotenbergHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${GOTENBERG_URL}/health`,
      { method: 'GET' },
      5000  // 5 segundos timeout
    );
    return response.ok;
  } catch {
    return false;
  }
}
```

## Tests de Seguridad

### Cobertura de Tests

1. **Validación de Tamaño:**
   - ✅ Acepta HTML dentro del límite
   - ✅ Rechaza HTML que excede 1MB
   - ✅ Maneja HTML vacío

2. **Sanitización:**
   - ✅ Remueve tags `<script>`
   - ✅ Remueve event handlers (`onclick`, etc.)
   - ✅ Remueve iframes peligrosos
   - ✅ Preserva contenido seguro
   - ✅ Maneja HTML malformado

3. **Conectividad:**
   - ✅ Verifica salud de Gotenberg
   - ✅ Maneja timeouts correctamente
   - ✅ Maneja errores de conexión

4. **Integración:**
   - ✅ Workflow completo con contenido peligroso
   - ✅ Generación exitosa con HTML válido
   - ✅ Aplicación de opciones personalizadas

### Ejecutar Tests

```bash
# Tests básicos de seguridad
npm test -- __tests__/security/pdf-basic.test.ts

# Tests completos de seguridad PDF
npm test -- __tests__/security/pdf-security.test.ts

# Todos los tests de seguridad
npm test -- __tests__/security/
```

## Verificación de Aislamiento

### 1. Verificar que Gotenberg NO es accesible externamente

```bash
# Desde el host - DEBE FALLAR
curl http://localhost:3002/health
# Error: Connection refused

# Verificar puertos expuestos
docker ps
# gotenberg NO debe mostrar puertos en la columna PORTS
```

### 2. Verificar comunicación interna

```bash
# Desde el contenedor web - DEBE FUNCIONAR
docker exec -it catequesis-web curl http://gotenberg:3000/health
# Respuesta: 200 OK
```

### 3. Verificar límites de recursos

```bash
# Verificar límites aplicados
docker stats catequesis-gotenberg
# CPU: máximo 100% (1 core)
# Memory: máximo 512MB
```

## Mitigaciones de Seguridad

### Prevención de SSRF
- ✅ Red interna sin acceso a internet
- ✅ Sanitización de URLs en HTML
- ✅ Whitelist de protocolos permitidos
- ✅ Sin acceso directo desde el host

### Prevención de XSS/Injection
- ✅ DOMPurify con configuración restrictiva
- ✅ Remoción de scripts y event handlers
- ✅ Whitelist de tags y atributos permitidos
- ✅ Validación de contenido antes del procesamiento

### Prevención de DoS
- ✅ Límite de tamaño de HTML (1MB)
- ✅ Timeout de requests (20s)
- ✅ Límites de CPU y memoria en contenedor
- ✅ Health checks para detectar problemas

### Prevención de Information Disclosure
- ✅ Logs sin contenido HTML original
- ✅ Mensajes de error genéricos
- ✅ Sin exposición de detalles internos

## Monitoreo y Alertas

### Métricas Recomendadas
- Tiempo de respuesta de Gotenberg
- Tasa de errores en generación PDF
- Uso de CPU/memoria del contenedor
- Intentos de acceso externo (deben fallar)

### Logs de Seguridad
```typescript
// Ejemplo de log seguro
console.error('PDF generation failed:', {
  error: 'Request timeout',
  htmlLength: 1500,  // Solo tamaño
  timestamp: '2024-01-15T10:30:00Z',
  // NO incluir: contenido HTML, URLs, parámetros
});
```

## Mantenimiento

### Actualizaciones Regulares
1. **Imagen Gotenberg:** Actualizar a versiones estables
2. **DOMPurify:** Mantener actualizado para nuevas vulnerabilidades
3. **Dependencias:** Auditoría regular con `npm audit`

### Revisión de Configuración
- Revisar logs de seguridad mensualmente
- Verificar que no hay puertos expuestos
- Probar health checks regularmente
- Validar que los tests de seguridad pasan

---

**Última actualización:** Enero 2024  
**Responsable:** Equipo de Desarrollo  
**Próxima revisión:** Febrero 2024