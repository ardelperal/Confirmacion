# Especificaciones Técnicas Completas - Web de Catequesis

## 1. ESTRUCTURA INICIAL DEL PROYECTO

### Tecnologías Base
- **Framework**: Next.js 14+ con App Router
- **Estilos**: Tailwind CSS + CSS personalizado para impresión
- **TypeScript**: Configuración completa
- **Dependencias clave**: gray-matter, playwright, docx, @sparticuz/chromium-min

### Estructura de Carpetas
```
web/
├── app/
│   ├── page.tsx                    # Página principal (/)
│   ├── modulo/
│   │   └── [module]/page.tsx       # Páginas de módulo (/modulo/A)
│   ├── sesion/
│   │   └── [code]/page.tsx         # Páginas de sesión (/sesion/A1)
│   ├── api/
│   │   ├── index.json/route.ts     # API del índice
│   │   └── export/
│   │       ├── pdf/[code]/route.ts # Exportación PDF
│   │       └── docx/[code]/route.ts# Exportación DOCX
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── SessionView.tsx             # Componente principal de sesión
│   ├── DownloadButtons.tsx         # Botones de descarga
│   └── Breadcrumbs.tsx             # Navegación breadcrumb
├── content/
│   ├── sessions/                   # Archivos MD de sesiones
│   │   ├── A1.md
│   │   ├── A2.md
│   │   └── ...
│   └── modules.yml                 # Configuración de módulos
├── styles/
│   └── print.css                   # Estilos específicos de impresión
└── middleware.ts                   # Protección opcional por contraseña
```

---

## 2. RUTAS Y COMPONENTES PRINCIPALES

### Rutas Implementadas
- **/** - Página principal con índice de módulos
- **/modulo/[module]** - Vista de módulo específico (A, B, C, D, E, F)
- **/sesion/[code]** - Vista de sesión individual (A1, A2, etc.)
- **/api/index.json** - API que devuelve el índice completo

### Componentes Clave

#### `<SessionView/>`
- Renderiza el contenido completo de una sesión
- Parsea Markdown con front-matter
- Aplica estilos de impresión A4
- Maneja la vista de previsualización

#### `<DownloadButtons/>`
- Botones fijos: Volver, PDF, DOCX, Ver MD
- Integración con APIs de exportación
- Estados de carga y error

#### `<Breadcrumbs/>`
- Navegación contextual
- Enlaces a módulo padre y sesiones relacionadas

---

## 3. ESTRATEGIA DE EXPORTACIÓN PDF A4

### Endpoint: `/api/export/pdf/[code]/route.ts`

**Proceso:**
1. Recuperar la página `/sesion/[code]` internamente
2. Renderizar con Playwright headless
3. Configurar parámetros de PDF:
   - Formato: A4
   - Márgenes: 2cm en todos los lados
   - printBackground: true
   - Orientación: portrait
4. Devolver PDF con nombre: `<code>_<slug>.pdf`

**Configuración Playwright:**
```typescript
const pdf = await page.pdf({
  format: 'A4',
  margin: {
    top: '2cm',
    right: '2cm',
    bottom: '2cm',
    left: '2cm'
  },
  printBackground: true
});
```

---

## 4. ESTRATEGIA DE EXPORTACIÓN DOCX

### Endpoint: `/api/export/docx/[code]/route.ts`

**Proceso:**
1. Usar librería `docx` para generar documentos
2. Configurar documento A4 con márgenes de 20mm
3. Definir estilos:
   - Heading1: 16pt, negrita
   - Heading2: 14pt, negrita
   - Normal: 11pt
   - Listas: viñetas y numeradas
4. Convertir bloques de plantilla a párrafos formateados
5. Devolver con nombre: `<code>_<slug>.docx`

**Estilos DOCX:**
```typescript
const styles = {
  paragraphStyles: [
    {
      id: "Heading1",
      name: "Heading 1",
      run: { size: 32, bold: true }
    },
    {
      id: "Heading2", 
      name: "Heading 2",
      run: { size: 28, bold: true }
    }
  ]
};
```

---

## 5. CARGA DE CONTENIDO INICIAL (SEED)

### Objetivo
Generar todas las sesiones A1-F4 en `/content/sessions/` usando la plantilla MD.

### Proceso:
1. **Llenar A1-A3** con contenido ya redactado del archivo `Lote_1_Sesiones_A1-A3.md`
2. **Usar índice y referencias** para generar A4-F4 restantes
3. **Crear `/content/modules.yml`** con títulos y orden de módulos
4. **Asegurar cumplimiento** de plantilla A4 estándar

### Formato Front-matter:
```yaml
---
title: "Título de la sesión"
code: "A1"
module: "A"
duration: 60
slug: "titulo-sesion"
keywords: ["palabra1", "palabra2"]
---
```

---

## 6. UX MÍNIMA A IMPLEMENTAR

### Elementos de Interfaz
- **Tipografía legible**: Tailwind prose, ancho máximo 800px
- **Botones fijos** en parte superior: Volver, Descargar PDF, Descargar DOCX, Ver MD
- **Badge de duración**: Visual mostrando 45/60/75 minutos
- **Navegación entre sesiones**: Botones "Anterior / Siguiente sesión"
- **Toggle "Vista de impresión"**: Añade clase `print-preview` para simular A4
- **Diseño responsive**: Siguiendo mejores prácticas UX

### Clases CSS Clave
```css
.print-preview {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: white;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

@media print {
  .no-print { display: none; }
  body { margin: 0; }
}
```

---

## 7. SEGURIDAD Y DESPLIEGUE

### Protección por Contraseña (Opcional)
- **Middleware**: Basic Auth usando variable de entorno
- **Variable**: `CATEQUESIS_PASSWORD`
- **Implementación**: middleware.ts con verificación simple

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const password = process.env.CATEQUESIS_PASSWORD;
  if (!password) return NextResponse.next();
  
  // Lógica de Basic Auth
}
```

### Despliegue en Vercel
- **Configuración**: vercel.json para funciones
- **Playwright**: Si no cabe en serverless, usar Edge Functions con `@sparticuz/chromium-min`
- **Variables de entorno**: Configurar en dashboard de Vercel

### Alternativa Edge Functions
```typescript
// Para PDF en Edge Runtime
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

export const runtime = 'edge';
```

---

## 8. README E INSTRUCCIONES

### Comandos Principales
```bash
# Instalación
npm install

# Desarrollo
npm run dev

# Build
npm run build

# Despliegue
vercel --prod
```

### Añadir Nuevas Sesiones
1. Crear archivo MD en `/content/sessions/`
2. Seguir formato front-matter establecido
3. Usar plantilla A4 estándar
4. Regenerar índice si es necesario

### Regenerar Índice
- El índice se genera automáticamente desde los archivos MD
- API `/api/index.json` lee dinámicamente el contenido
- No requiere regeneración manual

---

## 9. CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Estructura Base
- [ ] Configurar Next.js + Tailwind
- [ ] Crear estructura de carpetas
- [ ] Configurar TypeScript

### Fase 2: Componentes Core
- [ ] Implementar SessionView
- [ ] Crear DownloadButtons
- [ ] Desarrollar Breadcrumbs

### Fase 3: APIs y Exportación
- [ ] API de índice JSON
- [ ] Exportación PDF con Playwright
- [ ] Exportación DOCX

### Fase 4: Contenido y UX
- [ ] Cargar sesiones A1-A3
- [ ] Generar sesiones restantes
- [ ] Implementar UX mínima

### Fase 5: Seguridad y Despliegue
- [ ] Middleware de protección
- [ ] Configurar Vercel
- [ ] Documentar README

---

## 10. NOTAS TÉCNICAS IMPORTANTES

### Limitaciones Serverless
- Playwright puede exceder límites de Vercel
- Usar `@sparticuz/chromium-min` como alternativa
- Edge Functions para mejor rendimiento

### Optimizaciones
- Caché de sesiones parseadas
- Lazy loading de componentes
- Compresión de assets

### Mantenimiento
- Logs de errores en exportación
- Validación de archivos MD
- Backup automático de contenido

Este documento sirve como referencia completa para implementar toda la funcionalidad de la web de catequesis siguiendo las especificaciones proporcionadas.