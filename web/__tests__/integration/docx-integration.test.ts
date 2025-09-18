import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/docx/[code]/route';
import type { SessionContent } from '@/types';

// Mock de las dependencias problemáticas antes de importar
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBuffer: jest.fn()
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
    HEADING_3: 'HEADING_3',
    HEADING_4: 'HEADING_4'
  },
  AlignmentType: {
    CENTER: 'CENTER'
  },
  PageBreak: jest.fn(),
  LevelFormat: {
    DECIMAL: 'DECIMAL',
    BULLET: 'BULLET'
  }
}));

// Mock de unified y sus dependencias
jest.mock('unified', () => ({
  unified: jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    process: jest.fn().mockResolvedValue({ toString: () => '<p>Mocked HTML</p>' })
  }))
}));

jest.mock('remark-parse', () => jest.fn());
jest.mock('remark-rehype', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('rehype-stringify', () => jest.fn());

import { getSession } from '@/lib/content-loader';
import { Document, Packer } from 'docx';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPacker = Packer as jest.Mocked<typeof Packer>;

// Mock de cookies para controlar la autenticación
const mockCookieStore = {
  get: jest.fn()
};

// Configurar el mock de next/headers
const { cookies } = require('next/headers');
cookies.mockReturnValue(mockCookieStore);

describe('DOCX Integration Tests', () => {
  const defaultFrontMatter: SessionContent['frontMatter'] = {
    code: 'B2',
    title: 'Sesión de Prueba DOCX',
    module: 'modulo-b',
    duration: 45,
    objective: 'Probar la generación de documentos DOCX',
    materials: [],
    biblical_references: [],
    catechism_references: [],
    key_terms: {},
    status: 'published'
  };

  const defaultContent = `# Sesión de Prueba DOCX

## Contenido de ejemplo

### Lista con formato mixto
- Elemento normal
- **Elemento en negrita**
- *Elemento en cursiva*

### Lista anidada
1. Primer nivel
   - Subnivel a
   - Subnivel b
2. Segundo nivel
   - Otro subnivel

### Texto con formato especial
**Texto importante** y *texto enfatizado*.

---pagebreak---

## Segunda página

Contenido de la segunda página con más elementos.

### Tabla de ejemplo
| Columna 1 | Columna 2 |
|-----------|-----------|
| Dato 1    | Dato 2    |

### Cita
> Esta es una cita importante
> que abarca múltiples líneas.`;
  const createSession = (overrides: Partial<SessionContent> = {}): SessionContent => ({
    frontMatter: {
      ...defaultFrontMatter,
      ...(overrides.frontMatter ?? {})
    },
    content: overrides.content ?? defaultContent,
    htmlContent: overrides.htmlContent ?? '<p>Mocked HTML content</p>'
  });

  const mockSession = createSession();
  const mockDocxBuffer = Buffer.from('fake-docx-content');

  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear el mock de cookies para cada test
    mockCookieStore.get.mockReset();
    // Configurar comportamiento por defecto del mock de cookies
    mockCookieStore.get.mockReturnValue(null);
    // Mock exitoso por defecto
    mockPacker.toBuffer = jest.fn().mockResolvedValue(mockDocxBuffer);
  });

  describe('Endpoint /api/export/docx/[code]', () => {
    it('should generate DOCX for published session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('b2_sesin-de-prueba-docx.docx');
      
      // Verificar que se llamó a las funciones correctas
      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should generate DOCX for admin preview of draft session', async () => {
    const draftSession = createSession({
      frontMatter: { status: 'draft' }
    });
    mockGetSession.mockResolvedValue(draftSession);

    // Mock de cookies para simular autenticación de admin
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({
        value: JSON.stringify({ role: 'admin' })
      })
    };
    
    // Mock del módulo next/headers
    const { cookies } = require('next/headers');
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
    const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

    expect(response.status).toBe(200);
    expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'admin' });
  });

    it('should return 400 for invalid session code format', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/docx/invalid');
      const response = await GET(request, { params: Promise.resolve({ code: 'invalid' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no encontrada');
    });

    it('should return 404 for draft session without admin preview', async () => {
      const draftSession = createSession({
        frontMatter: { status: 'draft' }
      });
      mockGetSession.mockResolvedValue(draftSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no disponible');
    });

    it('should return 403 for admin preview without proper authentication', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      
      // Mock del módulo next/headers para simular falta de autenticación
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null)
      };
      
      const { cookies } = require('next/headers');
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('No autorizado para preview de admin');
    });

    it('should handle DOCX generation errors gracefully', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPacker.toBuffer = jest.fn().mockRejectedValue(new Error('DOCX generation failed'));

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('Document Structure Generation', () => {
    it('should create document with proper structure and formatting', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      // Verificar que Document fue creado con la configuración correcta
      expect(Document).toHaveBeenCalledWith(
        expect.objectContaining({
          numbering: expect.objectContaining({
            config: expect.arrayContaining([
              expect.objectContaining({
                reference: 'default',
                levels: expect.any(Array)
              })
            ])
          }),
          sections: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                page: expect.objectContaining({
                  size: expect.objectContaining({
                    orientation: 'portrait',
                    width: '210mm',
                    height: '297mm'
                  }),
                  margin: expect.objectContaining({
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                  })
                })
              }),
              children: expect.any(Array)
            })
          ])
        })
      );
    });

    it('should handle different markdown elements correctly', async () => {
const  = createSession({
  content: import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/docx/[code]/route';
import type { SessionContent } from '@/types';

// Mock de las dependencias problemáticas antes de importar
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBuffer: jest.fn()
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
    HEADING_3: 'HEADING_3',
    HEADING_4: 'HEADING_4'
  },
  AlignmentType: {
    CENTER: 'CENTER'
  },
  PageBreak: jest.fn(),
  LevelFormat: {
    DECIMAL: 'DECIMAL',
    BULLET: 'BULLET'
  }
}));

// Mock de unified y sus dependencias
jest.mock('unified', () => ({
  unified: jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    process: jest.fn().mockResolvedValue({ toString: () => '<p>Mocked HTML</p>' })
  }))
}));

jest.mock('remark-parse', () => jest.fn());
jest.mock('remark-rehype', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('rehype-stringify', () => jest.fn());

import { getSession } from '@/lib/content-loader';
import { Document, Packer } from 'docx';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPacker = Packer as jest.Mocked<typeof Packer>;

// Mock de cookies para controlar la autenticación
const mockCookieStore = {
  get: jest.fn()
};

// Configurar el mock de next/headers
const { cookies } = require('next/headers');
cookies.mockReturnValue(mockCookieStore);

describe('DOCX Integration Tests', () => {
  const defaultFrontMatter: SessionContent['frontMatter'] = {
    code: 'B2',
    title: 'Sesión de Prueba DOCX',
    module: 'modulo-b',
    duration: 45,
    objective: 'Probar la generación de documentos DOCX',
    materials: [],
    biblical_references: [],
    catechism_references: [],
    key_terms: {},
    status: 'published'
  };

  const defaultContent = `# Sesión de Prueba DOCX

## Contenido de ejemplo

### Lista con formato mixto
- Elemento normal
- **Elemento en negrita**
- *Elemento en cursiva*

### Lista anidada
1. Primer nivel
   - Subnivel a
   - Subnivel b
2. Segundo nivel
   - Otro subnivel

### Texto con formato especial
**Texto importante** y *texto enfatizado*.

---pagebreak---

## Segunda página

Contenido de la segunda página con más elementos.

### Tabla de ejemplo
| Columna 1 | Columna 2 |
|-----------|-----------|
| Dato 1    | Dato 2    |

### Cita
> Esta es una cita importante
> que abarca múltiples líneas.`;
  const createSession = (overrides: Partial<SessionContent> = {}): SessionContent => ({
    frontMatter: {
      ...defaultFrontMatter,
      ...(overrides.frontMatter ?? {})
    },
    content: overrides.content ?? defaultContent,
    htmlContent: overrides.htmlContent ?? '<p>Mocked HTML content</p>'
  });

  const mockSession = createSession();
  const mockDocxBuffer = Buffer.from('fake-docx-content');

  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear el mock de cookies para cada test
    mockCookieStore.get.mockReset();
    // Configurar comportamiento por defecto del mock de cookies
    mockCookieStore.get.mockReturnValue(null);
    // Mock exitoso por defecto
    mockPacker.toBuffer = jest.fn().mockResolvedValue(mockDocxBuffer);
  });

  describe('Endpoint /api/export/docx/[code]', () => {
    it('should generate DOCX for published session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('b2_sesin-de-prueba-docx.docx');
      
      // Verificar que se llamó a las funciones correctas
      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should generate DOCX for admin preview of draft session', async () => {
    const draftSession = createSession({
      frontMatter: { status: 'draft' }
    });
    mockGetSession.mockResolvedValue(draftSession);

    // Mock de cookies para simular autenticación de admin
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({
        value: JSON.stringify({ role: 'admin' })
      })
    };
    
    // Mock del módulo next/headers
    const { cookies } = require('next/headers');
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
    const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

    expect(response.status).toBe(200);
    expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'admin' });
  });

    it('should return 400 for invalid session code format', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/docx/invalid');
      const response = await GET(request, { params: Promise.resolve({ code: 'invalid' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no encontrada');
    });

    it('should return 404 for draft session without admin preview', async () => {
      const draftSession = createSession({
        frontMatter: { status: 'draft' }
      });
      mockGetSession.mockResolvedValue(draftSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no disponible');
    });

    it('should return 403 for admin preview without proper authentication', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      
      // Mock del módulo next/headers para simular falta de autenticación
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null)
      };
      
      const { cookies } = require('next/headers');
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('No autorizado para preview de admin');
    });

    it('should handle DOCX generation errors gracefully', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPacker.toBuffer = jest.fn().mockRejectedValue(new Error('DOCX generation failed'));

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('Document Structure Generation', () => {
    it('should create document with proper structure and formatting', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      // Verificar que Document fue creado con la configuración correcta
      expect(Document).toHaveBeenCalledWith(
        expect.objectContaining({
          numbering: expect.objectContaining({
            config: expect.arrayContaining([
              expect.objectContaining({
                reference: 'default',
                levels: expect.any(Array)
              })
            ])
          }),
          sections: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                page: expect.objectContaining({
                  size: expect.objectContaining({
                    orientation: 'portrait',
                    width: '210mm',
                    height: '297mm'
                  }),
                  margin: expect.objectContaining({
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                  })
                })
              }),
              children: expect.any(Array)
            })
          ])
        })
      );
    });

    it('should handle different markdown elements correctly', async () => {
      const complexSession = {
        ...mockSession,
        content: `# Título Principal

## Subtítulo

### Subtítulo Nivel 3

#### Subtítulo Nivel 4

Párrafo normal con **texto en negrita** y *texto en cursiva*.

- Lista con viñetas item 1
- Lista con viñetas item 2
  - Sub-item anidado
  - Otro sub-item

1. Lista numerada item 1
2. Lista numerada item 2
3. Lista numerada item 3

[ ] Checkbox no marcado
[ ] Otro checkbox

=== Encabezado Especial ===

5) Encabezado con número

---pagebreak---

Contenido después del salto de página.`
      };

      mockGetSession.mockResolvedValue(complexSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should handle HTML tags and special characters in content', async () => {
      const sessionWithHtml = {
        ...mockSession,
        content: `# Título con <strong>HTML</strong>

Párrafo con &amp; caracteres especiales &lt;tag&gt; y "comillas".

<div class="pagebreak"></div>

Contenido después del salto de página HTML.`
      };

      mockGetSession.mockResolvedValue(sessionWithHtml);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });

  describe('File Naming and Headers', () => {
    it('should generate correct filename from session title', async () => {
      const sessionWithComplexTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Sesión Muy Larga con Muchos Caracteres Especiales !@#$%^&*()_+ y Números 123'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithComplexTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('b2_sesin-muy-larga-con-muchos-caracteres-especiales');
      expect(contentDisposition).toContain('.docx');
    });

    it('should set correct response headers', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename=".+\.docx"$/);
    });

    it('should handle filename truncation for very long titles', async () => {
      const sessionWithVeryLongTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Este es un título extremadamente largo que debería ser truncado porque excede los cincuenta caracteres permitidos para el nombre del archivo'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithVeryLongTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('.docx');
      
      // Extraer el nombre del archivo de la cabecera
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        const titlePart = filename.replace(/^b2_/, '').replace(/\.docx$/, '');
        expect(titlePart.length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session content', async () => {
      const emptySession = {
        ...mockSession,
        content: ''
      };
      
      mockGetSession.mockResolvedValue(emptySession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle content with only whitespace', async () => {
      const whitespaceSession = {
        ...mockSession,
        content: '   \n\n   \t\t   \n   '
      };
      
      mockGetSession.mockResolvedValue(whitespaceSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle case-insensitive session codes', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
    });

    it('should handle various session code formats', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      // Test uppercase
      let request = new NextRequest('http://localhost:3000/api/export/docx/B2');
      let response = await GET(request, { params: Promise.resolve({ code: 'B2' }) });
      expect(response.status).toBe(200);

      // Test different valid codes
      const validCodes = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'];
      for (const code of validCodes) {
        request = new NextRequest(`http://localhost:3000/api/export/docx/${code.toLowerCase()}`);
        response = await GET(request, { params: Promise.resolve({ code: code.toLowerCase() }) });
        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid session code formats', async () => {
      const invalidCodes = ['G1', 'A7', 'AA', '11', 'S0', 'S10', 'invalid'];
      
      for (const code of invalidCodes) {
        const request = new NextRequest(`http://localhost:3000/api/export/docx/${code}`);
        const response = await GET(request, { params: Promise.resolve({ code }) });
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Código de sesión inválido');
      }
    });

    it('should handle very long content without errors', async () => {
      const longContent = Array(1000).fill(`## Sección

Contenido de la sección con texto largo que incluye **formato** y *cursiva*.

- Item de lista 1
- Item de lista 2

1. Item numerado 1
2. Item numerado 2

`).join('\n');

      const longSession = {
        ...mockSession,
        content: longContent
      };
      
      mockGetSession.mockResolvedValue(longSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });
  });

  describe('Content Processing', () => {
    it('should handle mixed formatting correctly', async () => {
      const mixedFormattingSession = {
        ...mockSession,
        content: `# Título Principal

Texto normal seguido de **texto en negrita** y después *texto en cursiva* y finalmente ***texto en negrita y cursiva***.

## Lista Mixta
- Item normal
- Item con **negrita**
- Item con *cursiva*
- Item con ***ambos***

1. Numerado normal
2. Numerado con **negrita**
3. Numerado con *cursiva*

[ ] Checkbox con **texto en negrita**
[ ] Checkbox con *texto en cursiva*`
      };

      mockGetSession.mockResolvedValue(mixedFormattingSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle nested lists correctly', async () => {
      const nestedListSession = {
        ...mockSession,
        content: `# Listas Anidadas

## Lista con viñetas anidada
- Nivel 1 item 1
  - Nivel 2 item 1
  - Nivel 2 item 2
    - Nivel 3 item 1
- Nivel 1 item 2

## Lista numerada anidada
1. Nivel 1 item 1
   1. Nivel 2 item 1
   2. Nivel 2 item 2
2. Nivel 1 item 2`
      };

      mockGetSession.mockResolvedValue(nestedListSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });
});








});

      mockGetSession.mockResolvedValue(complexSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should handle HTML tags and special characters in content', async () => {
const  = createSession({
  content: import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/docx/[code]/route';
import type { SessionContent } from '@/types';

// Mock de las dependencias problemáticas antes de importar
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBuffer: jest.fn()
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
    HEADING_3: 'HEADING_3',
    HEADING_4: 'HEADING_4'
  },
  AlignmentType: {
    CENTER: 'CENTER'
  },
  PageBreak: jest.fn(),
  LevelFormat: {
    DECIMAL: 'DECIMAL',
    BULLET: 'BULLET'
  }
}));

// Mock de unified y sus dependencias
jest.mock('unified', () => ({
  unified: jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    process: jest.fn().mockResolvedValue({ toString: () => '<p>Mocked HTML</p>' })
  }))
}));

jest.mock('remark-parse', () => jest.fn());
jest.mock('remark-rehype', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('rehype-stringify', () => jest.fn());

import { getSession } from '@/lib/content-loader';
import { Document, Packer } from 'docx';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPacker = Packer as jest.Mocked<typeof Packer>;

// Mock de cookies para controlar la autenticación
const mockCookieStore = {
  get: jest.fn()
};

// Configurar el mock de next/headers
const { cookies } = require('next/headers');
cookies.mockReturnValue(mockCookieStore);

describe('DOCX Integration Tests', () => {
  const defaultFrontMatter: SessionContent['frontMatter'] = {
    code: 'B2',
    title: 'Sesión de Prueba DOCX',
    module: 'modulo-b',
    duration: 45,
    objective: 'Probar la generación de documentos DOCX',
    materials: [],
    biblical_references: [],
    catechism_references: [],
    key_terms: {},
    status: 'published'
  };

  const defaultContent = `# Sesión de Prueba DOCX

## Contenido de ejemplo

### Lista con formato mixto
- Elemento normal
- **Elemento en negrita**
- *Elemento en cursiva*

### Lista anidada
1. Primer nivel
   - Subnivel a
   - Subnivel b
2. Segundo nivel
   - Otro subnivel

### Texto con formato especial
**Texto importante** y *texto enfatizado*.

---pagebreak---

## Segunda página

Contenido de la segunda página con más elementos.

### Tabla de ejemplo
| Columna 1 | Columna 2 |
|-----------|-----------|
| Dato 1    | Dato 2    |

### Cita
> Esta es una cita importante
> que abarca múltiples líneas.`;
  const createSession = (overrides: Partial<SessionContent> = {}): SessionContent => ({
    frontMatter: {
      ...defaultFrontMatter,
      ...(overrides.frontMatter ?? {})
    },
    content: overrides.content ?? defaultContent,
    htmlContent: overrides.htmlContent ?? '<p>Mocked HTML content</p>'
  });

  const mockSession = createSession();
  const mockDocxBuffer = Buffer.from('fake-docx-content');

  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear el mock de cookies para cada test
    mockCookieStore.get.mockReset();
    // Configurar comportamiento por defecto del mock de cookies
    mockCookieStore.get.mockReturnValue(null);
    // Mock exitoso por defecto
    mockPacker.toBuffer = jest.fn().mockResolvedValue(mockDocxBuffer);
  });

  describe('Endpoint /api/export/docx/[code]', () => {
    it('should generate DOCX for published session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('b2_sesin-de-prueba-docx.docx');
      
      // Verificar que se llamó a las funciones correctas
      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should generate DOCX for admin preview of draft session', async () => {
    const draftSession = createSession({
      frontMatter: { status: 'draft' }
    });
    mockGetSession.mockResolvedValue(draftSession);

    // Mock de cookies para simular autenticación de admin
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({
        value: JSON.stringify({ role: 'admin' })
      })
    };
    
    // Mock del módulo next/headers
    const { cookies } = require('next/headers');
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
    const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

    expect(response.status).toBe(200);
    expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'admin' });
  });

    it('should return 400 for invalid session code format', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/docx/invalid');
      const response = await GET(request, { params: Promise.resolve({ code: 'invalid' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no encontrada');
    });

    it('should return 404 for draft session without admin preview', async () => {
      const draftSession = createSession({
        frontMatter: { status: 'draft' }
      });
      mockGetSession.mockResolvedValue(draftSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no disponible');
    });

    it('should return 403 for admin preview without proper authentication', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      
      // Mock del módulo next/headers para simular falta de autenticación
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null)
      };
      
      const { cookies } = require('next/headers');
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('No autorizado para preview de admin');
    });

    it('should handle DOCX generation errors gracefully', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPacker.toBuffer = jest.fn().mockRejectedValue(new Error('DOCX generation failed'));

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('Document Structure Generation', () => {
    it('should create document with proper structure and formatting', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      // Verificar que Document fue creado con la configuración correcta
      expect(Document).toHaveBeenCalledWith(
        expect.objectContaining({
          numbering: expect.objectContaining({
            config: expect.arrayContaining([
              expect.objectContaining({
                reference: 'default',
                levels: expect.any(Array)
              })
            ])
          }),
          sections: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                page: expect.objectContaining({
                  size: expect.objectContaining({
                    orientation: 'portrait',
                    width: '210mm',
                    height: '297mm'
                  }),
                  margin: expect.objectContaining({
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                  })
                })
              }),
              children: expect.any(Array)
            })
          ])
        })
      );
    });

    it('should handle different markdown elements correctly', async () => {
      const complexSession = {
        ...mockSession,
        content: `# Título Principal

## Subtítulo

### Subtítulo Nivel 3

#### Subtítulo Nivel 4

Párrafo normal con **texto en negrita** y *texto en cursiva*.

- Lista con viñetas item 1
- Lista con viñetas item 2
  - Sub-item anidado
  - Otro sub-item

1. Lista numerada item 1
2. Lista numerada item 2
3. Lista numerada item 3

[ ] Checkbox no marcado
[ ] Otro checkbox

=== Encabezado Especial ===

5) Encabezado con número

---pagebreak---

Contenido después del salto de página.`
      };

      mockGetSession.mockResolvedValue(complexSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should handle HTML tags and special characters in content', async () => {
      const sessionWithHtml = {
        ...mockSession,
        content: `# Título con <strong>HTML</strong>

Párrafo con &amp; caracteres especiales &lt;tag&gt; y "comillas".

<div class="pagebreak"></div>

Contenido después del salto de página HTML.`
      };

      mockGetSession.mockResolvedValue(sessionWithHtml);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });

  describe('File Naming and Headers', () => {
    it('should generate correct filename from session title', async () => {
      const sessionWithComplexTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Sesión Muy Larga con Muchos Caracteres Especiales !@#$%^&*()_+ y Números 123'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithComplexTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('b2_sesin-muy-larga-con-muchos-caracteres-especiales');
      expect(contentDisposition).toContain('.docx');
    });

    it('should set correct response headers', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename=".+\.docx"$/);
    });

    it('should handle filename truncation for very long titles', async () => {
      const sessionWithVeryLongTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Este es un título extremadamente largo que debería ser truncado porque excede los cincuenta caracteres permitidos para el nombre del archivo'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithVeryLongTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('.docx');
      
      // Extraer el nombre del archivo de la cabecera
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        const titlePart = filename.replace(/^b2_/, '').replace(/\.docx$/, '');
        expect(titlePart.length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session content', async () => {
      const emptySession = {
        ...mockSession,
        content: ''
      };
      
      mockGetSession.mockResolvedValue(emptySession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle content with only whitespace', async () => {
      const whitespaceSession = {
        ...mockSession,
        content: '   \n\n   \t\t   \n   '
      };
      
      mockGetSession.mockResolvedValue(whitespaceSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle case-insensitive session codes', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
    });

    it('should handle various session code formats', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      // Test uppercase
      let request = new NextRequest('http://localhost:3000/api/export/docx/B2');
      let response = await GET(request, { params: Promise.resolve({ code: 'B2' }) });
      expect(response.status).toBe(200);

      // Test different valid codes
      const validCodes = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'];
      for (const code of validCodes) {
        request = new NextRequest(`http://localhost:3000/api/export/docx/${code.toLowerCase()}`);
        response = await GET(request, { params: Promise.resolve({ code: code.toLowerCase() }) });
        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid session code formats', async () => {
      const invalidCodes = ['G1', 'A7', 'AA', '11', 'S0', 'S10', 'invalid'];
      
      for (const code of invalidCodes) {
        const request = new NextRequest(`http://localhost:3000/api/export/docx/${code}`);
        const response = await GET(request, { params: Promise.resolve({ code }) });
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Código de sesión inválido');
      }
    });

    it('should handle very long content without errors', async () => {
      const longContent = Array(1000).fill(`## Sección

Contenido de la sección con texto largo que incluye **formato** y *cursiva*.

- Item de lista 1
- Item de lista 2

1. Item numerado 1
2. Item numerado 2

`).join('\n');

      const longSession = {
        ...mockSession,
        content: longContent
      };
      
      mockGetSession.mockResolvedValue(longSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });
  });

  describe('Content Processing', () => {
    it('should handle mixed formatting correctly', async () => {
      const mixedFormattingSession = {
        ...mockSession,
        content: `# Título Principal

Texto normal seguido de **texto en negrita** y después *texto en cursiva* y finalmente ***texto en negrita y cursiva***.

## Lista Mixta
- Item normal
- Item con **negrita**
- Item con *cursiva*
- Item con ***ambos***

1. Numerado normal
2. Numerado con **negrita**
3. Numerado con *cursiva*

[ ] Checkbox con **texto en negrita**
[ ] Checkbox con *texto en cursiva*`
      };

      mockGetSession.mockResolvedValue(mixedFormattingSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle nested lists correctly', async () => {
      const nestedListSession = {
        ...mockSession,
        content: `# Listas Anidadas

## Lista con viñetas anidada
- Nivel 1 item 1
  - Nivel 2 item 1
  - Nivel 2 item 2
    - Nivel 3 item 1
- Nivel 1 item 2

## Lista numerada anidada
1. Nivel 1 item 1
   1. Nivel 2 item 1
   2. Nivel 2 item 2
2. Nivel 1 item 2`
      };

      mockGetSession.mockResolvedValue(nestedListSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });
});








});

      mockGetSession.mockResolvedValue(sessionWithHtml);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });

  describe('File Naming and Headers', () => {
    it('should generate correct filename from session title', async () => {
      const sessionWithComplexTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Sesión Muy Larga con Muchos Caracteres Especiales !@#$%^&*()_+ y Números 123'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithComplexTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('b2_sesin-muy-larga-con-muchos-caracteres-especiales');
      expect(contentDisposition).toContain('.docx');
    });

    it('should set correct response headers', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename=".+\.docx"$/);
    });

    it('should handle filename truncation for very long titles', async () => {
      const sessionWithVeryLongTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Este es un título extremadamente largo que debería ser truncado porque excede los cincuenta caracteres permitidos para el nombre del archivo'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithVeryLongTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('.docx');
      
      // Extraer el nombre del archivo de la cabecera
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        const titlePart = filename.replace(/^b2_/, '').replace(/\.docx$/, '');
        expect(titlePart.length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session content', async () => {
const  = createSession({
  content: import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/docx/[code]/route';
import type { SessionContent } from '@/types';

// Mock de las dependencias problemáticas antes de importar
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBuffer: jest.fn()
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
    HEADING_3: 'HEADING_3',
    HEADING_4: 'HEADING_4'
  },
  AlignmentType: {
    CENTER: 'CENTER'
  },
  PageBreak: jest.fn(),
  LevelFormat: {
    DECIMAL: 'DECIMAL',
    BULLET: 'BULLET'
  }
}));

// Mock de unified y sus dependencias
jest.mock('unified', () => ({
  unified: jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    process: jest.fn().mockResolvedValue({ toString: () => '<p>Mocked HTML</p>' })
  }))
}));

jest.mock('remark-parse', () => jest.fn());
jest.mock('remark-rehype', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('rehype-stringify', () => jest.fn());

import { getSession } from '@/lib/content-loader';
import { Document, Packer } from 'docx';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPacker = Packer as jest.Mocked<typeof Packer>;

// Mock de cookies para controlar la autenticación
const mockCookieStore = {
  get: jest.fn()
};

// Configurar el mock de next/headers
const { cookies } = require('next/headers');
cookies.mockReturnValue(mockCookieStore);

describe('DOCX Integration Tests', () => {
  const defaultFrontMatter: SessionContent['frontMatter'] = {
    code: 'B2',
    title: 'Sesión de Prueba DOCX',
    module: 'modulo-b',
    duration: 45,
    objective: 'Probar la generación de documentos DOCX',
    materials: [],
    biblical_references: [],
    catechism_references: [],
    key_terms: {},
    status: 'published'
  };

  const defaultContent = `# Sesión de Prueba DOCX

## Contenido de ejemplo

### Lista con formato mixto
- Elemento normal
- **Elemento en negrita**
- *Elemento en cursiva*

### Lista anidada
1. Primer nivel
   - Subnivel a
   - Subnivel b
2. Segundo nivel
   - Otro subnivel

### Texto con formato especial
**Texto importante** y *texto enfatizado*.

---pagebreak---

## Segunda página

Contenido de la segunda página con más elementos.

### Tabla de ejemplo
| Columna 1 | Columna 2 |
|-----------|-----------|
| Dato 1    | Dato 2    |

### Cita
> Esta es una cita importante
> que abarca múltiples líneas.`;
  const createSession = (overrides: Partial<SessionContent> = {}): SessionContent => ({
    frontMatter: {
      ...defaultFrontMatter,
      ...(overrides.frontMatter ?? {})
    },
    content: overrides.content ?? defaultContent,
    htmlContent: overrides.htmlContent ?? '<p>Mocked HTML content</p>'
  });

  const mockSession = createSession();
  const mockDocxBuffer = Buffer.from('fake-docx-content');

  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear el mock de cookies para cada test
    mockCookieStore.get.mockReset();
    // Configurar comportamiento por defecto del mock de cookies
    mockCookieStore.get.mockReturnValue(null);
    // Mock exitoso por defecto
    mockPacker.toBuffer = jest.fn().mockResolvedValue(mockDocxBuffer);
  });

  describe('Endpoint /api/export/docx/[code]', () => {
    it('should generate DOCX for published session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('b2_sesin-de-prueba-docx.docx');
      
      // Verificar que se llamó a las funciones correctas
      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should generate DOCX for admin preview of draft session', async () => {
    const draftSession = createSession({
      frontMatter: { status: 'draft' }
    });
    mockGetSession.mockResolvedValue(draftSession);

    // Mock de cookies para simular autenticación de admin
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({
        value: JSON.stringify({ role: 'admin' })
      })
    };
    
    // Mock del módulo next/headers
    const { cookies } = require('next/headers');
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
    const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

    expect(response.status).toBe(200);
    expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'admin' });
  });

    it('should return 400 for invalid session code format', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/docx/invalid');
      const response = await GET(request, { params: Promise.resolve({ code: 'invalid' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no encontrada');
    });

    it('should return 404 for draft session without admin preview', async () => {
      const draftSession = createSession({
        frontMatter: { status: 'draft' }
      });
      mockGetSession.mockResolvedValue(draftSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no disponible');
    });

    it('should return 403 for admin preview without proper authentication', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      
      // Mock del módulo next/headers para simular falta de autenticación
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null)
      };
      
      const { cookies } = require('next/headers');
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('No autorizado para preview de admin');
    });

    it('should handle DOCX generation errors gracefully', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPacker.toBuffer = jest.fn().mockRejectedValue(new Error('DOCX generation failed'));

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('Document Structure Generation', () => {
    it('should create document with proper structure and formatting', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      // Verificar que Document fue creado con la configuración correcta
      expect(Document).toHaveBeenCalledWith(
        expect.objectContaining({
          numbering: expect.objectContaining({
            config: expect.arrayContaining([
              expect.objectContaining({
                reference: 'default',
                levels: expect.any(Array)
              })
            ])
          }),
          sections: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                page: expect.objectContaining({
                  size: expect.objectContaining({
                    orientation: 'portrait',
                    width: '210mm',
                    height: '297mm'
                  }),
                  margin: expect.objectContaining({
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                  })
                })
              }),
              children: expect.any(Array)
            })
          ])
        })
      );
    });

    it('should handle different markdown elements correctly', async () => {
      const complexSession = {
        ...mockSession,
        content: `# Título Principal

## Subtítulo

### Subtítulo Nivel 3

#### Subtítulo Nivel 4

Párrafo normal con **texto en negrita** y *texto en cursiva*.

- Lista con viñetas item 1
- Lista con viñetas item 2
  - Sub-item anidado
  - Otro sub-item

1. Lista numerada item 1
2. Lista numerada item 2
3. Lista numerada item 3

[ ] Checkbox no marcado
[ ] Otro checkbox

=== Encabezado Especial ===

5) Encabezado con número

---pagebreak---

Contenido después del salto de página.`
      };

      mockGetSession.mockResolvedValue(complexSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should handle HTML tags and special characters in content', async () => {
      const sessionWithHtml = {
        ...mockSession,
        content: `# Título con <strong>HTML</strong>

Párrafo con &amp; caracteres especiales &lt;tag&gt; y "comillas".

<div class="pagebreak"></div>

Contenido después del salto de página HTML.`
      };

      mockGetSession.mockResolvedValue(sessionWithHtml);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });

  describe('File Naming and Headers', () => {
    it('should generate correct filename from session title', async () => {
      const sessionWithComplexTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Sesión Muy Larga con Muchos Caracteres Especiales !@#$%^&*()_+ y Números 123'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithComplexTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('b2_sesin-muy-larga-con-muchos-caracteres-especiales');
      expect(contentDisposition).toContain('.docx');
    });

    it('should set correct response headers', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename=".+\.docx"$/);
    });

    it('should handle filename truncation for very long titles', async () => {
      const sessionWithVeryLongTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Este es un título extremadamente largo que debería ser truncado porque excede los cincuenta caracteres permitidos para el nombre del archivo'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithVeryLongTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('.docx');
      
      // Extraer el nombre del archivo de la cabecera
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        const titlePart = filename.replace(/^b2_/, '').replace(/\.docx$/, '');
        expect(titlePart.length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session content', async () => {
      const emptySession = {
        ...mockSession,
        content: ''
      };
      
      mockGetSession.mockResolvedValue(emptySession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle content with only whitespace', async () => {
      const whitespaceSession = {
        ...mockSession,
        content: '   \n\n   \t\t   \n   '
      };
      
      mockGetSession.mockResolvedValue(whitespaceSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle case-insensitive session codes', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
    });

    it('should handle various session code formats', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      // Test uppercase
      let request = new NextRequest('http://localhost:3000/api/export/docx/B2');
      let response = await GET(request, { params: Promise.resolve({ code: 'B2' }) });
      expect(response.status).toBe(200);

      // Test different valid codes
      const validCodes = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'];
      for (const code of validCodes) {
        request = new NextRequest(`http://localhost:3000/api/export/docx/${code.toLowerCase()}`);
        response = await GET(request, { params: Promise.resolve({ code: code.toLowerCase() }) });
        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid session code formats', async () => {
      const invalidCodes = ['G1', 'A7', 'AA', '11', 'S0', 'S10', 'invalid'];
      
      for (const code of invalidCodes) {
        const request = new NextRequest(`http://localhost:3000/api/export/docx/${code}`);
        const response = await GET(request, { params: Promise.resolve({ code }) });
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Código de sesión inválido');
      }
    });

    it('should handle very long content without errors', async () => {
      const longContent = Array(1000).fill(`## Sección

Contenido de la sección con texto largo que incluye **formato** y *cursiva*.

- Item de lista 1
- Item de lista 2

1. Item numerado 1
2. Item numerado 2

`).join('\n');

      const longSession = {
        ...mockSession,
        content: longContent
      };
      
      mockGetSession.mockResolvedValue(longSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });
  });

  describe('Content Processing', () => {
    it('should handle mixed formatting correctly', async () => {
      const mixedFormattingSession = {
        ...mockSession,
        content: `# Título Principal

Texto normal seguido de **texto en negrita** y después *texto en cursiva* y finalmente ***texto en negrita y cursiva***.

## Lista Mixta
- Item normal
- Item con **negrita**
- Item con *cursiva*
- Item con ***ambos***

1. Numerado normal
2. Numerado con **negrita**
3. Numerado con *cursiva*

[ ] Checkbox con **texto en negrita**
[ ] Checkbox con *texto en cursiva*`
      };

      mockGetSession.mockResolvedValue(mixedFormattingSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle nested lists correctly', async () => {
      const nestedListSession = {
        ...mockSession,
        content: `# Listas Anidadas

## Lista con viñetas anidada
- Nivel 1 item 1
  - Nivel 2 item 1
  - Nivel 2 item 2
    - Nivel 3 item 1
- Nivel 1 item 2

## Lista numerada anidada
1. Nivel 1 item 1
   1. Nivel 2 item 1
   2. Nivel 2 item 2
2. Nivel 1 item 2`
      };

      mockGetSession.mockResolvedValue(nestedListSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });
});








});
      
      mockGetSession.mockResolvedValue(emptySession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle content with only whitespace', async () => {
const  = createSession({
  content: import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/docx/[code]/route';
import type { SessionContent } from '@/types';

// Mock de las dependencias problemáticas antes de importar
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBuffer: jest.fn()
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
    HEADING_3: 'HEADING_3',
    HEADING_4: 'HEADING_4'
  },
  AlignmentType: {
    CENTER: 'CENTER'
  },
  PageBreak: jest.fn(),
  LevelFormat: {
    DECIMAL: 'DECIMAL',
    BULLET: 'BULLET'
  }
}));

// Mock de unified y sus dependencias
jest.mock('unified', () => ({
  unified: jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    process: jest.fn().mockResolvedValue({ toString: () => '<p>Mocked HTML</p>' })
  }))
}));

jest.mock('remark-parse', () => jest.fn());
jest.mock('remark-rehype', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('rehype-stringify', () => jest.fn());

import { getSession } from '@/lib/content-loader';
import { Document, Packer } from 'docx';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPacker = Packer as jest.Mocked<typeof Packer>;

// Mock de cookies para controlar la autenticación
const mockCookieStore = {
  get: jest.fn()
};

// Configurar el mock de next/headers
const { cookies } = require('next/headers');
cookies.mockReturnValue(mockCookieStore);

describe('DOCX Integration Tests', () => {
  const defaultFrontMatter: SessionContent['frontMatter'] = {
    code: 'B2',
    title: 'Sesión de Prueba DOCX',
    module: 'modulo-b',
    duration: 45,
    objective: 'Probar la generación de documentos DOCX',
    materials: [],
    biblical_references: [],
    catechism_references: [],
    key_terms: {},
    status: 'published'
  };

  const defaultContent = `# Sesión de Prueba DOCX

## Contenido de ejemplo

### Lista con formato mixto
- Elemento normal
- **Elemento en negrita**
- *Elemento en cursiva*

### Lista anidada
1. Primer nivel
   - Subnivel a
   - Subnivel b
2. Segundo nivel
   - Otro subnivel

### Texto con formato especial
**Texto importante** y *texto enfatizado*.

---pagebreak---

## Segunda página

Contenido de la segunda página con más elementos.

### Tabla de ejemplo
| Columna 1 | Columna 2 |
|-----------|-----------|
| Dato 1    | Dato 2    |

### Cita
> Esta es una cita importante
> que abarca múltiples líneas.`;
  const createSession = (overrides: Partial<SessionContent> = {}): SessionContent => ({
    frontMatter: {
      ...defaultFrontMatter,
      ...(overrides.frontMatter ?? {})
    },
    content: overrides.content ?? defaultContent,
    htmlContent: overrides.htmlContent ?? '<p>Mocked HTML content</p>'
  });

  const mockSession = createSession();
  const mockDocxBuffer = Buffer.from('fake-docx-content');

  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear el mock de cookies para cada test
    mockCookieStore.get.mockReset();
    // Configurar comportamiento por defecto del mock de cookies
    mockCookieStore.get.mockReturnValue(null);
    // Mock exitoso por defecto
    mockPacker.toBuffer = jest.fn().mockResolvedValue(mockDocxBuffer);
  });

  describe('Endpoint /api/export/docx/[code]', () => {
    it('should generate DOCX for published session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('b2_sesin-de-prueba-docx.docx');
      
      // Verificar que se llamó a las funciones correctas
      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should generate DOCX for admin preview of draft session', async () => {
    const draftSession = createSession({
      frontMatter: { status: 'draft' }
    });
    mockGetSession.mockResolvedValue(draftSession);

    // Mock de cookies para simular autenticación de admin
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({
        value: JSON.stringify({ role: 'admin' })
      })
    };
    
    // Mock del módulo next/headers
    const { cookies } = require('next/headers');
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
    const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

    expect(response.status).toBe(200);
    expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'admin' });
  });

    it('should return 400 for invalid session code format', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/docx/invalid');
      const response = await GET(request, { params: Promise.resolve({ code: 'invalid' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no encontrada');
    });

    it('should return 404 for draft session without admin preview', async () => {
      const draftSession = createSession({
        frontMatter: { status: 'draft' }
      });
      mockGetSession.mockResolvedValue(draftSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no disponible');
    });

    it('should return 403 for admin preview without proper authentication', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      
      // Mock del módulo next/headers para simular falta de autenticación
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null)
      };
      
      const { cookies } = require('next/headers');
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('No autorizado para preview de admin');
    });

    it('should handle DOCX generation errors gracefully', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPacker.toBuffer = jest.fn().mockRejectedValue(new Error('DOCX generation failed'));

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('Document Structure Generation', () => {
    it('should create document with proper structure and formatting', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      // Verificar que Document fue creado con la configuración correcta
      expect(Document).toHaveBeenCalledWith(
        expect.objectContaining({
          numbering: expect.objectContaining({
            config: expect.arrayContaining([
              expect.objectContaining({
                reference: 'default',
                levels: expect.any(Array)
              })
            ])
          }),
          sections: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                page: expect.objectContaining({
                  size: expect.objectContaining({
                    orientation: 'portrait',
                    width: '210mm',
                    height: '297mm'
                  }),
                  margin: expect.objectContaining({
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                  })
                })
              }),
              children: expect.any(Array)
            })
          ])
        })
      );
    });

    it('should handle different markdown elements correctly', async () => {
      const complexSession = {
        ...mockSession,
        content: `# Título Principal

## Subtítulo

### Subtítulo Nivel 3

#### Subtítulo Nivel 4

Párrafo normal con **texto en negrita** y *texto en cursiva*.

- Lista con viñetas item 1
- Lista con viñetas item 2
  - Sub-item anidado
  - Otro sub-item

1. Lista numerada item 1
2. Lista numerada item 2
3. Lista numerada item 3

[ ] Checkbox no marcado
[ ] Otro checkbox

=== Encabezado Especial ===

5) Encabezado con número

---pagebreak---

Contenido después del salto de página.`
      };

      mockGetSession.mockResolvedValue(complexSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should handle HTML tags and special characters in content', async () => {
      const sessionWithHtml = {
        ...mockSession,
        content: `# Título con <strong>HTML</strong>

Párrafo con &amp; caracteres especiales &lt;tag&gt; y "comillas".

<div class="pagebreak"></div>

Contenido después del salto de página HTML.`
      };

      mockGetSession.mockResolvedValue(sessionWithHtml);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });

  describe('File Naming and Headers', () => {
    it('should generate correct filename from session title', async () => {
      const sessionWithComplexTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Sesión Muy Larga con Muchos Caracteres Especiales !@#$%^&*()_+ y Números 123'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithComplexTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('b2_sesin-muy-larga-con-muchos-caracteres-especiales');
      expect(contentDisposition).toContain('.docx');
    });

    it('should set correct response headers', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename=".+\.docx"$/);
    });

    it('should handle filename truncation for very long titles', async () => {
      const sessionWithVeryLongTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Este es un título extremadamente largo que debería ser truncado porque excede los cincuenta caracteres permitidos para el nombre del archivo'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithVeryLongTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('.docx');
      
      // Extraer el nombre del archivo de la cabecera
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        const titlePart = filename.replace(/^b2_/, '').replace(/\.docx$/, '');
        expect(titlePart.length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session content', async () => {
      const emptySession = {
        ...mockSession,
        content: ''
      };
      
      mockGetSession.mockResolvedValue(emptySession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle content with only whitespace', async () => {
      const whitespaceSession = {
        ...mockSession,
        content: '   \n\n   \t\t   \n   '
      };
      
      mockGetSession.mockResolvedValue(whitespaceSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle case-insensitive session codes', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
    });

    it('should handle various session code formats', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      // Test uppercase
      let request = new NextRequest('http://localhost:3000/api/export/docx/B2');
      let response = await GET(request, { params: Promise.resolve({ code: 'B2' }) });
      expect(response.status).toBe(200);

      // Test different valid codes
      const validCodes = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'];
      for (const code of validCodes) {
        request = new NextRequest(`http://localhost:3000/api/export/docx/${code.toLowerCase()}`);
        response = await GET(request, { params: Promise.resolve({ code: code.toLowerCase() }) });
        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid session code formats', async () => {
      const invalidCodes = ['G1', 'A7', 'AA', '11', 'S0', 'S10', 'invalid'];
      
      for (const code of invalidCodes) {
        const request = new NextRequest(`http://localhost:3000/api/export/docx/${code}`);
        const response = await GET(request, { params: Promise.resolve({ code }) });
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Código de sesión inválido');
      }
    });

    it('should handle very long content without errors', async () => {
      const longContent = Array(1000).fill(`## Sección

Contenido de la sección con texto largo que incluye **formato** y *cursiva*.

- Item de lista 1
- Item de lista 2

1. Item numerado 1
2. Item numerado 2

`).join('\n');

      const longSession = {
        ...mockSession,
        content: longContent
      };
      
      mockGetSession.mockResolvedValue(longSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });
  });

  describe('Content Processing', () => {
    it('should handle mixed formatting correctly', async () => {
      const mixedFormattingSession = {
        ...mockSession,
        content: `# Título Principal

Texto normal seguido de **texto en negrita** y después *texto en cursiva* y finalmente ***texto en negrita y cursiva***.

## Lista Mixta
- Item normal
- Item con **negrita**
- Item con *cursiva*
- Item con ***ambos***

1. Numerado normal
2. Numerado con **negrita**
3. Numerado con *cursiva*

[ ] Checkbox con **texto en negrita**
[ ] Checkbox con *texto en cursiva*`
      };

      mockGetSession.mockResolvedValue(mixedFormattingSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle nested lists correctly', async () => {
      const nestedListSession = {
        ...mockSession,
        content: `# Listas Anidadas

## Lista con viñetas anidada
- Nivel 1 item 1
  - Nivel 2 item 1
  - Nivel 2 item 2
    - Nivel 3 item 1
- Nivel 1 item 2

## Lista numerada anidada
1. Nivel 1 item 1
   1. Nivel 2 item 1
   2. Nivel 2 item 2
2. Nivel 1 item 2`
      };

      mockGetSession.mockResolvedValue(nestedListSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });
});








});
      
      mockGetSession.mockResolvedValue(whitespaceSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle case-insensitive session codes', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
    });

    it('should handle various session code formats', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      // Test uppercase
      let request = new NextRequest('http://localhost:3000/api/export/docx/B2');
      let response = await GET(request, { params: Promise.resolve({ code: 'B2' }) });
      expect(response.status).toBe(200);

      // Test different valid codes
      const validCodes = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'];
      for (const code of validCodes) {
        request = new NextRequest(`http://localhost:3000/api/export/docx/${code.toLowerCase()}`);
        response = await GET(request, { params: Promise.resolve({ code: code.toLowerCase() }) });
        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid session code formats', async () => {
      const invalidCodes = ['G1', 'A7', 'AA', '11', 'S0', 'S10', 'invalid'];
      
      for (const code of invalidCodes) {
        const request = new NextRequest(`http://localhost:3000/api/export/docx/${code}`);
        const response = await GET(request, { params: Promise.resolve({ code }) });
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Código de sesión inválido');
      }
    });

    it('should handle very long content without errors', async () => {
      const longContent = Array(1000).fill(`## Sección

Contenido de la sección con texto largo que incluye **formato** y *cursiva*.

- Item de lista 1
- Item de lista 2

1. Item numerado 1
2. Item numerado 2

`).join('\n');

const  = createSession({
  content: import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/docx/[code]/route';
import type { SessionContent } from '@/types';

// Mock de las dependencias problemáticas antes de importar
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBuffer: jest.fn()
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
    HEADING_3: 'HEADING_3',
    HEADING_4: 'HEADING_4'
  },
  AlignmentType: {
    CENTER: 'CENTER'
  },
  PageBreak: jest.fn(),
  LevelFormat: {
    DECIMAL: 'DECIMAL',
    BULLET: 'BULLET'
  }
}));

// Mock de unified y sus dependencias
jest.mock('unified', () => ({
  unified: jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    process: jest.fn().mockResolvedValue({ toString: () => '<p>Mocked HTML</p>' })
  }))
}));

jest.mock('remark-parse', () => jest.fn());
jest.mock('remark-rehype', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('rehype-stringify', () => jest.fn());

import { getSession } from '@/lib/content-loader';
import { Document, Packer } from 'docx';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPacker = Packer as jest.Mocked<typeof Packer>;

// Mock de cookies para controlar la autenticación
const mockCookieStore = {
  get: jest.fn()
};

// Configurar el mock de next/headers
const { cookies } = require('next/headers');
cookies.mockReturnValue(mockCookieStore);

describe('DOCX Integration Tests', () => {
  const defaultFrontMatter: SessionContent['frontMatter'] = {
    code: 'B2',
    title: 'Sesión de Prueba DOCX',
    module: 'modulo-b',
    duration: 45,
    objective: 'Probar la generación de documentos DOCX',
    materials: [],
    biblical_references: [],
    catechism_references: [],
    key_terms: {},
    status: 'published'
  };

  const defaultContent = `# Sesión de Prueba DOCX

## Contenido de ejemplo

### Lista con formato mixto
- Elemento normal
- **Elemento en negrita**
- *Elemento en cursiva*

### Lista anidada
1. Primer nivel
   - Subnivel a
   - Subnivel b
2. Segundo nivel
   - Otro subnivel

### Texto con formato especial
**Texto importante** y *texto enfatizado*.

---pagebreak---

## Segunda página

Contenido de la segunda página con más elementos.

### Tabla de ejemplo
| Columna 1 | Columna 2 |
|-----------|-----------|
| Dato 1    | Dato 2    |

### Cita
> Esta es una cita importante
> que abarca múltiples líneas.`;
  const createSession = (overrides: Partial<SessionContent> = {}): SessionContent => ({
    frontMatter: {
      ...defaultFrontMatter,
      ...(overrides.frontMatter ?? {})
    },
    content: overrides.content ?? defaultContent,
    htmlContent: overrides.htmlContent ?? '<p>Mocked HTML content</p>'
  });

  const mockSession = createSession();
  const mockDocxBuffer = Buffer.from('fake-docx-content');

  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear el mock de cookies para cada test
    mockCookieStore.get.mockReset();
    // Configurar comportamiento por defecto del mock de cookies
    mockCookieStore.get.mockReturnValue(null);
    // Mock exitoso por defecto
    mockPacker.toBuffer = jest.fn().mockResolvedValue(mockDocxBuffer);
  });

  describe('Endpoint /api/export/docx/[code]', () => {
    it('should generate DOCX for published session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('b2_sesin-de-prueba-docx.docx');
      
      // Verificar que se llamó a las funciones correctas
      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should generate DOCX for admin preview of draft session', async () => {
    const draftSession = createSession({
      frontMatter: { status: 'draft' }
    });
    mockGetSession.mockResolvedValue(draftSession);

    // Mock de cookies para simular autenticación de admin
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({
        value: JSON.stringify({ role: 'admin' })
      })
    };
    
    // Mock del módulo next/headers
    const { cookies } = require('next/headers');
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
    const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

    expect(response.status).toBe(200);
    expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'admin' });
  });

    it('should return 400 for invalid session code format', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/docx/invalid');
      const response = await GET(request, { params: Promise.resolve({ code: 'invalid' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no encontrada');
    });

    it('should return 404 for draft session without admin preview', async () => {
      const draftSession = createSession({
        frontMatter: { status: 'draft' }
      });
      mockGetSession.mockResolvedValue(draftSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no disponible');
    });

    it('should return 403 for admin preview without proper authentication', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      
      // Mock del módulo next/headers para simular falta de autenticación
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null)
      };
      
      const { cookies } = require('next/headers');
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('No autorizado para preview de admin');
    });

    it('should handle DOCX generation errors gracefully', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPacker.toBuffer = jest.fn().mockRejectedValue(new Error('DOCX generation failed'));

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('Document Structure Generation', () => {
    it('should create document with proper structure and formatting', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      // Verificar que Document fue creado con la configuración correcta
      expect(Document).toHaveBeenCalledWith(
        expect.objectContaining({
          numbering: expect.objectContaining({
            config: expect.arrayContaining([
              expect.objectContaining({
                reference: 'default',
                levels: expect.any(Array)
              })
            ])
          }),
          sections: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                page: expect.objectContaining({
                  size: expect.objectContaining({
                    orientation: 'portrait',
                    width: '210mm',
                    height: '297mm'
                  }),
                  margin: expect.objectContaining({
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                  })
                })
              }),
              children: expect.any(Array)
            })
          ])
        })
      );
    });

    it('should handle different markdown elements correctly', async () => {
      const complexSession = {
        ...mockSession,
        content: `# Título Principal

## Subtítulo

### Subtítulo Nivel 3

#### Subtítulo Nivel 4

Párrafo normal con **texto en negrita** y *texto en cursiva*.

- Lista con viñetas item 1
- Lista con viñetas item 2
  - Sub-item anidado
  - Otro sub-item

1. Lista numerada item 1
2. Lista numerada item 2
3. Lista numerada item 3

[ ] Checkbox no marcado
[ ] Otro checkbox

=== Encabezado Especial ===

5) Encabezado con número

---pagebreak---

Contenido después del salto de página.`
      };

      mockGetSession.mockResolvedValue(complexSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should handle HTML tags and special characters in content', async () => {
      const sessionWithHtml = {
        ...mockSession,
        content: `# Título con <strong>HTML</strong>

Párrafo con &amp; caracteres especiales &lt;tag&gt; y "comillas".

<div class="pagebreak"></div>

Contenido después del salto de página HTML.`
      };

      mockGetSession.mockResolvedValue(sessionWithHtml);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });

  describe('File Naming and Headers', () => {
    it('should generate correct filename from session title', async () => {
      const sessionWithComplexTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Sesión Muy Larga con Muchos Caracteres Especiales !@#$%^&*()_+ y Números 123'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithComplexTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('b2_sesin-muy-larga-con-muchos-caracteres-especiales');
      expect(contentDisposition).toContain('.docx');
    });

    it('should set correct response headers', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename=".+\.docx"$/);
    });

    it('should handle filename truncation for very long titles', async () => {
      const sessionWithVeryLongTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Este es un título extremadamente largo que debería ser truncado porque excede los cincuenta caracteres permitidos para el nombre del archivo'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithVeryLongTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('.docx');
      
      // Extraer el nombre del archivo de la cabecera
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        const titlePart = filename.replace(/^b2_/, '').replace(/\.docx$/, '');
        expect(titlePart.length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session content', async () => {
      const emptySession = {
        ...mockSession,
        content: ''
      };
      
      mockGetSession.mockResolvedValue(emptySession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle content with only whitespace', async () => {
      const whitespaceSession = {
        ...mockSession,
        content: '   \n\n   \t\t   \n   '
      };
      
      mockGetSession.mockResolvedValue(whitespaceSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle case-insensitive session codes', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
    });

    it('should handle various session code formats', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      // Test uppercase
      let request = new NextRequest('http://localhost:3000/api/export/docx/B2');
      let response = await GET(request, { params: Promise.resolve({ code: 'B2' }) });
      expect(response.status).toBe(200);

      // Test different valid codes
      const validCodes = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'];
      for (const code of validCodes) {
        request = new NextRequest(`http://localhost:3000/api/export/docx/${code.toLowerCase()}`);
        response = await GET(request, { params: Promise.resolve({ code: code.toLowerCase() }) });
        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid session code formats', async () => {
      const invalidCodes = ['G1', 'A7', 'AA', '11', 'S0', 'S10', 'invalid'];
      
      for (const code of invalidCodes) {
        const request = new NextRequest(`http://localhost:3000/api/export/docx/${code}`);
        const response = await GET(request, { params: Promise.resolve({ code }) });
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Código de sesión inválido');
      }
    });

    it('should handle very long content without errors', async () => {
      const longContent = Array(1000).fill(`## Sección

Contenido de la sección con texto largo que incluye **formato** y *cursiva*.

- Item de lista 1
- Item de lista 2

1. Item numerado 1
2. Item numerado 2

`).join('\n');

      const longSession = {
        ...mockSession,
        content: longContent
      };
      
      mockGetSession.mockResolvedValue(longSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });
  });

  describe('Content Processing', () => {
    it('should handle mixed formatting correctly', async () => {
      const mixedFormattingSession = {
        ...mockSession,
        content: `# Título Principal

Texto normal seguido de **texto en negrita** y después *texto en cursiva* y finalmente ***texto en negrita y cursiva***.

## Lista Mixta
- Item normal
- Item con **negrita**
- Item con *cursiva*
- Item con ***ambos***

1. Numerado normal
2. Numerado con **negrita**
3. Numerado con *cursiva*

[ ] Checkbox con **texto en negrita**
[ ] Checkbox con *texto en cursiva*`
      };

      mockGetSession.mockResolvedValue(mixedFormattingSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle nested lists correctly', async () => {
      const nestedListSession = {
        ...mockSession,
        content: `# Listas Anidadas

## Lista con viñetas anidada
- Nivel 1 item 1
  - Nivel 2 item 1
  - Nivel 2 item 2
    - Nivel 3 item 1
- Nivel 1 item 2

## Lista numerada anidada
1. Nivel 1 item 1
   1. Nivel 2 item 1
   2. Nivel 2 item 2
2. Nivel 1 item 2`
      };

      mockGetSession.mockResolvedValue(nestedListSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });
});








});
      
      mockGetSession.mockResolvedValue(longSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });
  });

  describe('Content Processing', () => {
    it('should handle mixed formatting correctly', async () => {
const  = createSession({
  content: import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/docx/[code]/route';
import type { SessionContent } from '@/types';

// Mock de las dependencias problemáticas antes de importar
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBuffer: jest.fn()
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
    HEADING_3: 'HEADING_3',
    HEADING_4: 'HEADING_4'
  },
  AlignmentType: {
    CENTER: 'CENTER'
  },
  PageBreak: jest.fn(),
  LevelFormat: {
    DECIMAL: 'DECIMAL',
    BULLET: 'BULLET'
  }
}));

// Mock de unified y sus dependencias
jest.mock('unified', () => ({
  unified: jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    process: jest.fn().mockResolvedValue({ toString: () => '<p>Mocked HTML</p>' })
  }))
}));

jest.mock('remark-parse', () => jest.fn());
jest.mock('remark-rehype', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('rehype-stringify', () => jest.fn());

import { getSession } from '@/lib/content-loader';
import { Document, Packer } from 'docx';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPacker = Packer as jest.Mocked<typeof Packer>;

// Mock de cookies para controlar la autenticación
const mockCookieStore = {
  get: jest.fn()
};

// Configurar el mock de next/headers
const { cookies } = require('next/headers');
cookies.mockReturnValue(mockCookieStore);

describe('DOCX Integration Tests', () => {
  const defaultFrontMatter: SessionContent['frontMatter'] = {
    code: 'B2',
    title: 'Sesión de Prueba DOCX',
    module: 'modulo-b',
    duration: 45,
    objective: 'Probar la generación de documentos DOCX',
    materials: [],
    biblical_references: [],
    catechism_references: [],
    key_terms: {},
    status: 'published'
  };

  const defaultContent = `# Sesión de Prueba DOCX

## Contenido de ejemplo

### Lista con formato mixto
- Elemento normal
- **Elemento en negrita**
- *Elemento en cursiva*

### Lista anidada
1. Primer nivel
   - Subnivel a
   - Subnivel b
2. Segundo nivel
   - Otro subnivel

### Texto con formato especial
**Texto importante** y *texto enfatizado*.

---pagebreak---

## Segunda página

Contenido de la segunda página con más elementos.

### Tabla de ejemplo
| Columna 1 | Columna 2 |
|-----------|-----------|
| Dato 1    | Dato 2    |

### Cita
> Esta es una cita importante
> que abarca múltiples líneas.`;
  const createSession = (overrides: Partial<SessionContent> = {}): SessionContent => ({
    frontMatter: {
      ...defaultFrontMatter,
      ...(overrides.frontMatter ?? {})
    },
    content: overrides.content ?? defaultContent,
    htmlContent: overrides.htmlContent ?? '<p>Mocked HTML content</p>'
  });

  const mockSession = createSession();
  const mockDocxBuffer = Buffer.from('fake-docx-content');

  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear el mock de cookies para cada test
    mockCookieStore.get.mockReset();
    // Configurar comportamiento por defecto del mock de cookies
    mockCookieStore.get.mockReturnValue(null);
    // Mock exitoso por defecto
    mockPacker.toBuffer = jest.fn().mockResolvedValue(mockDocxBuffer);
  });

  describe('Endpoint /api/export/docx/[code]', () => {
    it('should generate DOCX for published session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('b2_sesin-de-prueba-docx.docx');
      
      // Verificar que se llamó a las funciones correctas
      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should generate DOCX for admin preview of draft session', async () => {
    const draftSession = createSession({
      frontMatter: { status: 'draft' }
    });
    mockGetSession.mockResolvedValue(draftSession);

    // Mock de cookies para simular autenticación de admin
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({
        value: JSON.stringify({ role: 'admin' })
      })
    };
    
    // Mock del módulo next/headers
    const { cookies } = require('next/headers');
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
    const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

    expect(response.status).toBe(200);
    expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'admin' });
  });

    it('should return 400 for invalid session code format', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/docx/invalid');
      const response = await GET(request, { params: Promise.resolve({ code: 'invalid' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no encontrada');
    });

    it('should return 404 for draft session without admin preview', async () => {
      const draftSession = createSession({
        frontMatter: { status: 'draft' }
      });
      mockGetSession.mockResolvedValue(draftSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no disponible');
    });

    it('should return 403 for admin preview without proper authentication', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      
      // Mock del módulo next/headers para simular falta de autenticación
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null)
      };
      
      const { cookies } = require('next/headers');
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('No autorizado para preview de admin');
    });

    it('should handle DOCX generation errors gracefully', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPacker.toBuffer = jest.fn().mockRejectedValue(new Error('DOCX generation failed'));

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('Document Structure Generation', () => {
    it('should create document with proper structure and formatting', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      // Verificar que Document fue creado con la configuración correcta
      expect(Document).toHaveBeenCalledWith(
        expect.objectContaining({
          numbering: expect.objectContaining({
            config: expect.arrayContaining([
              expect.objectContaining({
                reference: 'default',
                levels: expect.any(Array)
              })
            ])
          }),
          sections: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                page: expect.objectContaining({
                  size: expect.objectContaining({
                    orientation: 'portrait',
                    width: '210mm',
                    height: '297mm'
                  }),
                  margin: expect.objectContaining({
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                  })
                })
              }),
              children: expect.any(Array)
            })
          ])
        })
      );
    });

    it('should handle different markdown elements correctly', async () => {
      const complexSession = {
        ...mockSession,
        content: `# Título Principal

## Subtítulo

### Subtítulo Nivel 3

#### Subtítulo Nivel 4

Párrafo normal con **texto en negrita** y *texto en cursiva*.

- Lista con viñetas item 1
- Lista con viñetas item 2
  - Sub-item anidado
  - Otro sub-item

1. Lista numerada item 1
2. Lista numerada item 2
3. Lista numerada item 3

[ ] Checkbox no marcado
[ ] Otro checkbox

=== Encabezado Especial ===

5) Encabezado con número

---pagebreak---

Contenido después del salto de página.`
      };

      mockGetSession.mockResolvedValue(complexSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should handle HTML tags and special characters in content', async () => {
      const sessionWithHtml = {
        ...mockSession,
        content: `# Título con <strong>HTML</strong>

Párrafo con &amp; caracteres especiales &lt;tag&gt; y "comillas".

<div class="pagebreak"></div>

Contenido después del salto de página HTML.`
      };

      mockGetSession.mockResolvedValue(sessionWithHtml);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });

  describe('File Naming and Headers', () => {
    it('should generate correct filename from session title', async () => {
      const sessionWithComplexTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Sesión Muy Larga con Muchos Caracteres Especiales !@#$%^&*()_+ y Números 123'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithComplexTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('b2_sesin-muy-larga-con-muchos-caracteres-especiales');
      expect(contentDisposition).toContain('.docx');
    });

    it('should set correct response headers', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename=".+\.docx"$/);
    });

    it('should handle filename truncation for very long titles', async () => {
      const sessionWithVeryLongTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Este es un título extremadamente largo que debería ser truncado porque excede los cincuenta caracteres permitidos para el nombre del archivo'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithVeryLongTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('.docx');
      
      // Extraer el nombre del archivo de la cabecera
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        const titlePart = filename.replace(/^b2_/, '').replace(/\.docx$/, '');
        expect(titlePart.length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session content', async () => {
      const emptySession = {
        ...mockSession,
        content: ''
      };
      
      mockGetSession.mockResolvedValue(emptySession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle content with only whitespace', async () => {
      const whitespaceSession = {
        ...mockSession,
        content: '   \n\n   \t\t   \n   '
      };
      
      mockGetSession.mockResolvedValue(whitespaceSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle case-insensitive session codes', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
    });

    it('should handle various session code formats', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      // Test uppercase
      let request = new NextRequest('http://localhost:3000/api/export/docx/B2');
      let response = await GET(request, { params: Promise.resolve({ code: 'B2' }) });
      expect(response.status).toBe(200);

      // Test different valid codes
      const validCodes = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'];
      for (const code of validCodes) {
        request = new NextRequest(`http://localhost:3000/api/export/docx/${code.toLowerCase()}`);
        response = await GET(request, { params: Promise.resolve({ code: code.toLowerCase() }) });
        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid session code formats', async () => {
      const invalidCodes = ['G1', 'A7', 'AA', '11', 'S0', 'S10', 'invalid'];
      
      for (const code of invalidCodes) {
        const request = new NextRequest(`http://localhost:3000/api/export/docx/${code}`);
        const response = await GET(request, { params: Promise.resolve({ code }) });
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Código de sesión inválido');
      }
    });

    it('should handle very long content without errors', async () => {
      const longContent = Array(1000).fill(`## Sección

Contenido de la sección con texto largo que incluye **formato** y *cursiva*.

- Item de lista 1
- Item de lista 2

1. Item numerado 1
2. Item numerado 2

`).join('\n');

      const longSession = {
        ...mockSession,
        content: longContent
      };
      
      mockGetSession.mockResolvedValue(longSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });
  });

  describe('Content Processing', () => {
    it('should handle mixed formatting correctly', async () => {
      const mixedFormattingSession = {
        ...mockSession,
        content: `# Título Principal

Texto normal seguido de **texto en negrita** y después *texto en cursiva* y finalmente ***texto en negrita y cursiva***.

## Lista Mixta
- Item normal
- Item con **negrita**
- Item con *cursiva*
- Item con ***ambos***

1. Numerado normal
2. Numerado con **negrita**
3. Numerado con *cursiva*

[ ] Checkbox con **texto en negrita**
[ ] Checkbox con *texto en cursiva*`
      };

      mockGetSession.mockResolvedValue(mixedFormattingSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle nested lists correctly', async () => {
      const nestedListSession = {
        ...mockSession,
        content: `# Listas Anidadas

## Lista con viñetas anidada
- Nivel 1 item 1
  - Nivel 2 item 1
  - Nivel 2 item 2
    - Nivel 3 item 1
- Nivel 1 item 2

## Lista numerada anidada
1. Nivel 1 item 1
   1. Nivel 2 item 1
   2. Nivel 2 item 2
2. Nivel 1 item 2`
      };

      mockGetSession.mockResolvedValue(nestedListSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });
});








});

      mockGetSession.mockResolvedValue(mixedFormattingSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle nested lists correctly', async () => {
const  = createSession({
  content: import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/docx/[code]/route';
import type { SessionContent } from '@/types';

// Mock de las dependencias problemáticas antes de importar
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBuffer: jest.fn()
  },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {
    HEADING_1: 'HEADING_1',
    HEADING_2: 'HEADING_2',
    HEADING_3: 'HEADING_3',
    HEADING_4: 'HEADING_4'
  },
  AlignmentType: {
    CENTER: 'CENTER'
  },
  PageBreak: jest.fn(),
  LevelFormat: {
    DECIMAL: 'DECIMAL',
    BULLET: 'BULLET'
  }
}));

// Mock de unified y sus dependencias
jest.mock('unified', () => ({
  unified: jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    process: jest.fn().mockResolvedValue({ toString: () => '<p>Mocked HTML</p>' })
  }))
}));

jest.mock('remark-parse', () => jest.fn());
jest.mock('remark-rehype', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('rehype-stringify', () => jest.fn());

import { getSession } from '@/lib/content-loader';
import { Document, Packer } from 'docx';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockPacker = Packer as jest.Mocked<typeof Packer>;

// Mock de cookies para controlar la autenticación
const mockCookieStore = {
  get: jest.fn()
};

// Configurar el mock de next/headers
const { cookies } = require('next/headers');
cookies.mockReturnValue(mockCookieStore);

describe('DOCX Integration Tests', () => {
  const defaultFrontMatter: SessionContent['frontMatter'] = {
    code: 'B2',
    title: 'Sesión de Prueba DOCX',
    module: 'modulo-b',
    duration: 45,
    objective: 'Probar la generación de documentos DOCX',
    materials: [],
    biblical_references: [],
    catechism_references: [],
    key_terms: {},
    status: 'published'
  };

  const defaultContent = `# Sesión de Prueba DOCX

## Contenido de ejemplo

### Lista con formato mixto
- Elemento normal
- **Elemento en negrita**
- *Elemento en cursiva*

### Lista anidada
1. Primer nivel
   - Subnivel a
   - Subnivel b
2. Segundo nivel
   - Otro subnivel

### Texto con formato especial
**Texto importante** y *texto enfatizado*.

---pagebreak---

## Segunda página

Contenido de la segunda página con más elementos.

### Tabla de ejemplo
| Columna 1 | Columna 2 |
|-----------|-----------|
| Dato 1    | Dato 2    |

### Cita
> Esta es una cita importante
> que abarca múltiples líneas.`;
  const createSession = (overrides: Partial<SessionContent> = {}): SessionContent => ({
    frontMatter: {
      ...defaultFrontMatter,
      ...(overrides.frontMatter ?? {})
    },
    content: overrides.content ?? defaultContent,
    htmlContent: overrides.htmlContent ?? '<p>Mocked HTML content</p>'
  });

  const mockSession = createSession();
  const mockDocxBuffer = Buffer.from('fake-docx-content');

  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear el mock de cookies para cada test
    mockCookieStore.get.mockReset();
    // Configurar comportamiento por defecto del mock de cookies
    mockCookieStore.get.mockReturnValue(null);
    // Mock exitoso por defecto
    mockPacker.toBuffer = jest.fn().mockResolvedValue(mockDocxBuffer);
  });

  describe('Endpoint /api/export/docx/[code]', () => {
    it('should generate DOCX for published session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('b2_sesin-de-prueba-docx.docx');
      
      // Verificar que se llamó a las funciones correctas
      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should generate DOCX for admin preview of draft session', async () => {
    const draftSession = createSession({
      frontMatter: { status: 'draft' }
    });
    mockGetSession.mockResolvedValue(draftSession);

    // Mock de cookies para simular autenticación de admin
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({
        value: JSON.stringify({ role: 'admin' })
      })
    };
    
    // Mock del módulo next/headers
    const { cookies } = require('next/headers');
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
    const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

    expect(response.status).toBe(200);
    expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'admin' });
  });

    it('should return 400 for invalid session code format', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/docx/invalid');
      const response = await GET(request, { params: Promise.resolve({ code: 'invalid' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no encontrada');
    });

    it('should return 404 for draft session without admin preview', async () => {
      const draftSession = createSession({
        frontMatter: { status: 'draft' }
      });
      mockGetSession.mockResolvedValue(draftSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no disponible');
    });

    it('should return 403 for admin preview without proper authentication', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      
      // Mock del módulo next/headers para simular falta de autenticación
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null)
      };
      
      const { cookies } = require('next/headers');
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2?adminPreview=1');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('No autorizado para preview de admin');
    });

    it('should handle DOCX generation errors gracefully', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockPacker.toBuffer = jest.fn().mockRejectedValue(new Error('DOCX generation failed'));

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('Document Structure Generation', () => {
    it('should create document with proper structure and formatting', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      // Verificar que Document fue creado con la configuración correcta
      expect(Document).toHaveBeenCalledWith(
        expect.objectContaining({
          numbering: expect.objectContaining({
            config: expect.arrayContaining([
              expect.objectContaining({
                reference: 'default',
                levels: expect.any(Array)
              })
            ])
          }),
          sections: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                page: expect.objectContaining({
                  size: expect.objectContaining({
                    orientation: 'portrait',
                    width: '210mm',
                    height: '297mm'
                  }),
                  margin: expect.objectContaining({
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                  })
                })
              }),
              children: expect.any(Array)
            })
          ])
        })
      );
    });

    it('should handle different markdown elements correctly', async () => {
      const complexSession = {
        ...mockSession,
        content: `# Título Principal

## Subtítulo

### Subtítulo Nivel 3

#### Subtítulo Nivel 4

Párrafo normal con **texto en negrita** y *texto en cursiva*.

- Lista con viñetas item 1
- Lista con viñetas item 2
  - Sub-item anidado
  - Otro sub-item

1. Lista numerada item 1
2. Lista numerada item 2
3. Lista numerada item 3

[ ] Checkbox no marcado
[ ] Otro checkbox

=== Encabezado Especial ===

5) Encabezado con número

---pagebreak---

Contenido después del salto de página.`
      };

      mockGetSession.mockResolvedValue(complexSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });

    it('should handle HTML tags and special characters in content', async () => {
      const sessionWithHtml = {
        ...mockSession,
        content: `# Título con <strong>HTML</strong>

Párrafo con &amp; caracteres especiales &lt;tag&gt; y "comillas".

<div class="pagebreak"></div>

Contenido después del salto de página HTML.`
      };

      mockGetSession.mockResolvedValue(sessionWithHtml);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });

  describe('File Naming and Headers', () => {
    it('should generate correct filename from session title', async () => {
      const sessionWithComplexTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Sesión Muy Larga con Muchos Caracteres Especiales !@#$%^&*()_+ y Números 123'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithComplexTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('b2_sesin-muy-larga-con-muchos-caracteres-especiales');
      expect(contentDisposition).toContain('.docx');
    });

    it('should set correct response headers', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename=".+\.docx"$/);
    });

    it('should handle filename truncation for very long titles', async () => {
      const sessionWithVeryLongTitle = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Este es un título extremadamente largo que debería ser truncado porque excede los cincuenta caracteres permitidos para el nombre del archivo'
        }
      };
      
      mockGetSession.mockResolvedValue(sessionWithVeryLongTitle);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('.docx');
      
      // Extraer el nombre del archivo de la cabecera
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        const titlePart = filename.replace(/^b2_/, '').replace(/\.docx$/, '');
        expect(titlePart.length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session content', async () => {
      const emptySession = {
        ...mockSession,
        content: ''
      };
      
      mockGetSession.mockResolvedValue(emptySession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle content with only whitespace', async () => {
      const whitespaceSession = {
        ...mockSession,
        content: '   \n\n   \t\t   \n   '
      };
      
      mockGetSession.mockResolvedValue(whitespaceSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle case-insensitive session codes', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(mockGetSession).toHaveBeenCalledWith('b2', { visibility: 'public' });
    });

    it('should handle various session code formats', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      // Test uppercase
      let request = new NextRequest('http://localhost:3000/api/export/docx/B2');
      let response = await GET(request, { params: Promise.resolve({ code: 'B2' }) });
      expect(response.status).toBe(200);

      // Test different valid codes
      const validCodes = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'];
      for (const code of validCodes) {
        request = new NextRequest(`http://localhost:3000/api/export/docx/${code.toLowerCase()}`);
        response = await GET(request, { params: Promise.resolve({ code: code.toLowerCase() }) });
        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid session code formats', async () => {
      const invalidCodes = ['G1', 'A7', 'AA', '11', 'S0', 'S10', 'invalid'];
      
      for (const code of invalidCodes) {
        const request = new NextRequest(`http://localhost:3000/api/export/docx/${code}`);
        const response = await GET(request, { params: Promise.resolve({ code }) });
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBe('Código de sesión inválido');
      }
    });

    it('should handle very long content without errors', async () => {
      const longContent = Array(1000).fill(`## Sección

Contenido de la sección con texto largo que incluye **formato** y *cursiva*.

- Item de lista 1
- Item de lista 2

1. Item numerado 1
2. Item numerado 2

`).join('\n');

      const longSession = {
        ...mockSession,
        content: longContent
      };
      
      mockGetSession.mockResolvedValue(longSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
      expect(mockPacker.toBuffer).toHaveBeenCalled();
    });
  });

  describe('Content Processing', () => {
    it('should handle mixed formatting correctly', async () => {
      const mixedFormattingSession = {
        ...mockSession,
        content: `# Título Principal

Texto normal seguido de **texto en negrita** y después *texto en cursiva* y finalmente ***texto en negrita y cursiva***.

## Lista Mixta
- Item normal
- Item con **negrita**
- Item con *cursiva*
- Item con ***ambos***

1. Numerado normal
2. Numerado con **negrita**
3. Numerado con *cursiva*

[ ] Checkbox con **texto en negrita**
[ ] Checkbox con *texto en cursiva*`
      };

      mockGetSession.mockResolvedValue(mixedFormattingSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });

    it('should handle nested lists correctly', async () => {
      const nestedListSession = {
        ...mockSession,
        content: `# Listas Anidadas

## Lista con viñetas anidada
- Nivel 1 item 1
  - Nivel 2 item 1
  - Nivel 2 item 2
    - Nivel 3 item 1
- Nivel 1 item 2

## Lista numerada anidada
1. Nivel 1 item 1
   1. Nivel 2 item 1
   2. Nivel 2 item 2
2. Nivel 1 item 2`
      };

      mockGetSession.mockResolvedValue(nestedListSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });
});








});

      mockGetSession.mockResolvedValue(nestedListSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/b2');
      const response = await GET(request, { params: Promise.resolve({ code: 'b2' }) });

      expect(response.status).toBe(200);
      expect(Document).toHaveBeenCalled();
    });
  });
});








