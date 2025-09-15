import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { logAdminAction, createLogContext } from '@/lib/logging-middleware';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';

const DEFAULT_TEMPLATE = `---
code: {CODE}
module: "{MODULE}"
title: "Título de la Sesión"
duration: 60
bible: []
cic: []
materials: ["Biblia", "Hojas A4", "Bolígrafos"]
status: "draft"
version: 1
editedBy: "parroco"
editedAt: "{EDITED_AT}"
publishedAt:
---

# Curso de Confirmación (12–13)
## Sesión {CODE}: {TITLE}

### OBJETIVO
Describir el objetivo catequético de esta sesión en una frase clara.

### MATERIALES
- Biblia marcada
- Hojas A4 / tarjetas
- Bolígrafo/lápices
- Otros materiales específicos

---pagebreak---

### ESQUEMA (≈60 min; ajustable a 45/75)

#### 1) Oración inicial — 5 min
**Texto bíblico:** (Referencia bíblica)
**Guía:** Instrucción breve para el catequista
**Oración:** Padre Nuestro / oración espontánea

#### 2) Dinámica/Actividad — 10–15 min
**Propósito:** Explicar el objetivo de la dinámica
**Pasos:**
1. Primer paso de la actividad
2. Segundo paso
3. Tercer paso

**Variante sin contacto / online:** Adaptación para modalidad virtual

#### 3) Catequesis guiada — 15 min
**Idea central:** Desarrollar el kerigma del tema en 3-5 líneas

**Citas bíblicas:** (Ref1), (Ref2), (Ref3 opcional)

**Catecismo (CIC):** (nº1–nº2 ...)

**Términos clave:**
- **Término 1:** Definición en una línea
- **Término 2:** Definición en una línea
- **Término 3:** Definición en una línea

#### 4) Puesta en común / Aplicación — 15 min
**Preguntas para el diálogo:**
- ¿Pregunta 1?
- ¿Pregunta 2?
- ¿Pregunta 3?

**Sugerencia de testimonio:** Párrafo con ejemplo o testimonio relevante

**Actividad breve:** Dibujo, role play u otra actividad opcional

#### 5) Compromiso y oración final — 10 min
**Gesto:** Tarjeta, diario o acto concreto
**Oración/canto:** Título o texto breve
**Despedida:** Frase de despedida

---pagebreak---

### EVALUACIÓN RÁPIDA (catequista)
[ ] Repiten la idea clave con sus palabras
[ ] Identifican 1 cita bíblica del tema
[ ] Asumen un compromiso concreto y realista

### PARA CASA (1 opción)
- Leer (referencia) y escribir 2 líneas: "¿Qué me dice Dios?"
- o realizar (pequeño servicio) y contarlo la próxima vez

### NOTAS AL CATEQUISTA
- **Sensibilidades/seguridad:** Consideraciones especiales
- **Adaptaciones (grupo grande/pequeño):** Ajustes según el tamaño del grupo
- **Si sobra tiempo:** Actividad corta adicional
`;

export async function POST(request: NextRequest) {
  const logContext = createLogContext(request);
  
  try {
    // Verificar rate limiting
    const rateLimitResponse = await checkAdminRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Verificar autenticación
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    // Validar código
    if (!code || !code.match(/^[A-F][1-6]$/)) {
      return NextResponse.json(
        { error: 'Código inválido. Debe seguir el formato A1-F6' },
        { status: 400 }
      );
    }

    const sessionsDir = path.join(process.cwd(), 'content', 'sessions');
    const filePath = path.join(sessionsDir, `${code}.md`);

    // Verificar si ya existe
    try {
      await fs.access(filePath);
      return NextResponse.json(
        { error: 'La sesión ya existe' },
        { status: 409 }
      );
    } catch {
      // El archivo no existe, podemos crearlo
    }

    // Crear directorio si no existe
    await fs.mkdir(sessionsDir, { recursive: true });

    // Determinar módulo y título por defecto
    const module = code.charAt(0);
    const moduleNames: Record<string, string> = {
      'A': 'Fundamentos',
      'B': 'Jesucristo',
      'C': 'Espíritu Santo',
      'D': 'Iglesia',
      'E': 'Sacramentos',
      'F': 'Vida Cristiana'
    };
    
    const moduleName = moduleNames[module] || 'Módulo';
    const title = `${moduleName} - Sesión ${code.charAt(1)}`;

    // Generar contenido desde plantilla
    const now = new Date().toISOString();
    const content = DEFAULT_TEMPLATE
      .replace(/{CODE}/g, code)
      .replace(/{MODULE}/g, module)
      .replace(/{TITLE}/g, title)
      .replace(/{EDITED_AT}/g, now);

    // Escribir archivo
    await fs.writeFile(filePath, content, 'utf-8');

    // Log de auditoría
    const auditLogPath = path.join(process.cwd(), 'content', '.audit.log');
    const auditEntry = {
      ts: now,
      user: 'parroco',
      action: 'create',
      code,
      version: 1
    };
    
    try {
      await fs.appendFile(auditLogPath, JSON.stringify(auditEntry) + '\n');
    } catch (error) {
      console.error('Error writing audit log:', error);
    }

    // Log acción administrativa
    logAdminAction('CREATE', 'session', {
      ...logContext,
      resourceId: code,
      module: moduleNames[code[0] as keyof typeof moduleNames],
      title: title
    });

    return NextResponse.json({ 
      ok: true, 
      code,
      message: 'Sesión creada exitosamente'
    });
  } catch (error: any) {
    // Log error administrativo
    logAdminAction('CREATE_ERROR', 'session', {
      ...logContext,
      error: error.message,
      stack: error.stack
    });
    
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}