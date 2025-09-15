# Configuración de Content Security Policy (CSP)

## Configuración Actual

La aplicación tiene configurada una Content Security Policy (CSP) restrictiva que previene ataques XSS y clickjacking:

```javascript
Content-Security-Policy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
```

## Directivas Explicadas

- **default-src 'self'**: Por defecto, solo permite recursos del mismo origen
- **script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:**: Scripts del mismo origen, inline y eval (necesario para Next.js)
- **style-src 'self' 'unsafe-inline'**: Estilos del mismo origen e inline (necesario para CSS-in-JS)
- **img-src 'self' data: blob:**: Imágenes del mismo origen, data URIs y blobs
- **font-src 'self' data:**: Fuentes del mismo origen y data URIs
- **connect-src 'self' https:**: Conexiones AJAX/fetch al mismo origen y HTTPS
- **frame-ancestors 'none'**: Previene que la página sea embebida en iframes
- **base-uri 'self'**: Solo permite base URIs del mismo origen
- **form-action 'self'**: Solo permite envío de formularios al mismo origen

## Cómo Añadir CDNs de Forma Segura

### ❌ NUNCA hacer esto:
```javascript
// MAL - Permite cualquier origen
script-src 'self' *;
style-src 'self' *;
```

### ✅ Forma correcta - Orígenes explícitos:

#### 1. Para añadir Google Fonts:
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  }
];
```

#### 2. Para añadir CDN de JavaScript (ej: jQuery):
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://code.jquery.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  }
];
```

#### 3. Para añadir múltiples CDNs:
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://code.jquery.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  }
];
```

## Configuración por Entorno

### Desarrollo (más permisivo para debugging):
```javascript
if (process.env.NODE_ENV === 'development') {
  cspValue = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: http://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https: http://localhost:* ws://localhost:*; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
}
```

### Producción (más restrictivo):
```javascript
if (process.env.NODE_ENV === 'production') {
  cspValue = "default-src 'self'; script-src 'self' blob:; style-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
}
```

## Mejores Prácticas

### 1. Usar Nonces para Scripts Inline (Recomendado)
```javascript
// En lugar de 'unsafe-inline', usar nonces
script-src 'self' 'nonce-{random-value}';
```

### 2. Usar Hashes para Scripts Específicos
```javascript
// Para scripts específicos conocidos
script-src 'self' 'sha256-{hash-del-script}';
```

### 3. Reportar Violaciones de CSP
```javascript
const cspWithReporting = cspValue + "; report-uri /api/csp-report";
```

## Verificación de CSP

### Herramientas de Testing:
1. **Browser DevTools**: Consola muestra violaciones de CSP
2. **CSP Evaluator**: https://csp-evaluator.withgoogle.com/
3. **Tests automatizados**: Ver `__tests__/security-headers.test.ts`

### Comandos para verificar:
```bash
# Ejecutar tests de seguridad
npm test -- --testPathPattern=security-headers

# Verificar headers en desarrollo
curl -I http://localhost:3000

# Verificar headers en producción
curl -I https://tu-dominio.com
```

## Solución de Problemas Comunes

### Error: "Refused to load script"
- **Causa**: Script de CDN no permitido en CSP
- **Solución**: Añadir el dominio específico a `script-src`

### Error: "Refused to apply inline style"
- **Causa**: CSS inline bloqueado
- **Solución**: Usar `'unsafe-inline'` o implementar nonces/hashes

### Error: "Refused to frame"
- **Causa**: `frame-ancestors 'none'` previene embedding
- **Solución**: Si necesitas embedding, cambiar a `frame-ancestors 'self'` o dominios específicos

## Configuración Actual en next.config.js

Para modificar la CSP actual, edita el archivo `next.config.js`:

```javascript
// Headers de seguridad
async headers() {
  const securityHeaders = [
    {
      key: 'Content-Security-Policy',
      value: "TU_NUEVA_CSP_AQUI"
    },
    // ... otras cabeceras
  ];
  // ...
}
```

## Recursos Adicionales

- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [CSP Level 3 Specification](https://www.w3.org/TR/CSP3/)