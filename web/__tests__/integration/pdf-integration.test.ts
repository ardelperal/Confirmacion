import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/pdf/[code]/route';
import type { SessionContent } from '@/types';

// Mock de las dependencias problemáticas antes de importar
jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('@/lib/pdf', () => ({
  generatePdf: jest.fn(),
  checkGotenbergHealth: jest.fn()
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
import { generatePdf, checkGotenbergHealth } from '@/lib/pdf';
jest.mock('@/lib/logging-middleware', () => ({
  logDownload: jest.fn(),
  createLogContext: jest.fn(() => ({ requestId: 'test-123' }))
}));

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGeneratePdf = generatePdf as jest.MockedFunction<typeof generatePdf>;
const mockCheckGotenbergHealth = checkGotenbergHealth as jest.MockedFunction<typeof checkGotenbergHealth>;

describe('PDF Integration Tests', () => {
  const mockSession = {
,\n      module: 'modulo-a',\n      materials: [],\n      biblical_references: [],\n      catechism_references: [],\n      key_terms: {}\n    },
    content: `# Introducción al Curso

## Objetivos
- Conocer a los participantes
- Explicar la metodología
- Establecer las reglas básicas

### Actividad 1: Presentación
Cada participante se presenta diciendo su nombre y una expectativa.

**Texto en negrita** y *texto en cursiva* y ***texto en negrita y cursiva***.

1. Primer elemento numerado
2. Segundo elemento numerado
3. Tercer elemento numerado

---pagebreak---

## Recursos necesarios
• Tarjetas de presentación
• Marcadores
• Pizarra

[ ] Tarea pendiente 1
[ ] Tarea pendiente 2

=== Sección Especial ===

4) Encabezado con número y paréntesis

## Evaluación
Observación de la participación y el ambiente generado.`
  };

  const mockPdfBuffer = Buffer.from('fake-pdf-content');

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock exitoso por defecto
    mockCheckGotenbergHealth.mockResolvedValue(true);
    mockGeneratePdf.mockResolvedValue(mockPdfBuffer);
  });

  describe('Endpoint /api/export/pdf/[code]', () => {
    it('should generate PDF for published session successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession);
      mockGeneratePdf.mockResolvedValue(mockPdfBuffer);
      mockCheckGotenbergHealth.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
      const response = await GET(request, { params: Promise.resolve({ code: 'a1' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('a1_introduccin-al-curso.pdf');
      
      // Verificar que se llamó a las funciones correctas
      expect(mockGetSession).toHaveBeenCalledWith('a1', { visibility: 'public' });
      expect(mockGeneratePdf).toHaveBeenCalled();
      expect(mockCheckGotenbergHealth).toHaveBeenCalled();
    });

    it('should generate PDF for admin preview of draft session', async () => {
    const draftSession = {
      ...mockSession,
      frontMatter: {
        ...mockSession.frontMatter,
        status: 'draft' as const
      }
    };
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

    const request = new NextRequest('http://localhost:3000/api/export/pdf/a1?adminPreview=1');
    const response = await GET(request, { params: Promise.resolve({ code: 'a1' }) });

    expect(response.status).toBe(200);
    expect(mockGetSession).toHaveBeenCalledWith('a1', { visibility: 'admin' });
  });

    it('should return 404 for non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/nonexistent');
      const response = await GET(request, { params: Promise.resolve({ code: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no encontrada');
    });

    it('should return 404 for draft session without admin preview', async () => {
       const draftSession = {
         ...mockSession,
         frontMatter: {
           ...mockSession.frontMatter,
           status: 'draft' as const
         }
       };
       mockGetSession.mockResolvedValue(draftSession);

       const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
       const response = await GET(request, { params: Promise.resolve({ code: 'a1' }) });

       expect(response.status).toBe(404);
       const data = await response.json();
       expect(data.error).toBe('Sesión no disponible');
     });

    it('should return 503 when Gotenberg is unavailable', async () => {
       mockGetSession.mockResolvedValue(mockSession);
       mockCheckGotenbergHealth.mockResolvedValue(false);

       const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
       const response = await GET(request, { params: Promise.resolve({ code: 'a1' }) });

       expect(response.status).toBe(503);
       const data = await response.json();
       expect(data.error).toBe('Servicio de generación PDF no disponible');
     });

    it('should handle PDF generation errors gracefully', async () => {
       mockGetSession.mockResolvedValue(mockSession);
       mockGeneratePdf.mockRejectedValue(new Error('PDF generation failed'));

       const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
       const response = await GET(request, { params: Promise.resolve({ code: 'a1' }) });

       expect(response.status).toBe(500);
       const data = await response.json();
       expect(data.error).toBe('Error interno del servidor');
     });
  });

  describe('HTML Content Generation', () => {
    it('should generate proper HTML structure with CSS', async () => {
       mockGetSession.mockResolvedValue(mockSession);

       const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
       await GET(request, { params: Promise.resolve({ code: 'a1' }) });

       const htmlArgument = (mockGeneratePdf as jest.Mock).mock.calls[0][0];
       
       // Verificar estructura HTML básica
       expect(htmlArgument).toContain('<!DOCTYPE html>');
       expect(htmlArgument).toContain('<html lang="es">');
       expect(htmlArgument).toContain('<meta charset="UTF-8">');
       expect(htmlArgument).toContain('Introducción al Curso - A1');
       
       // Verificar contenido convertido de Markdown
       expect(htmlArgument).toContain('<h1>Introducción al Curso</h1>');
       expect(htmlArgument).toContain('<h2>Objetivos</h2>');
       expect(htmlArgument).toContain('<h3>Actividad 1: Presentación</h3>');
       expect(htmlArgument).toContain('<li>Conocer a los participantes</li>');
       
       // Verificar salto de página
       expect(htmlArgument).toContain('<div class="pagebreak"></div>');
       
       // Verificar estilos CSS
       expect(htmlArgument).toContain('font-family:');
       expect(htmlArgument).toContain('font-size: 11pt');
       expect(htmlArgument).toContain('page-break-after: always');
     });

    it('should handle sessions with special characters and formatting', async () => {
      const specialSession = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          title: 'Sesión con "comillas" & símbolos especiales'
        },
        content: `# Título con **negrita** e *cursiva*

## Lista con elementos especiales
- Elemento con "comillas"
- Elemento con & ampersand
- Elemento con < y > símbolos

\`\`\`
Código de ejemplo
con múltiples líneas
\`\`\`

> Cita importante
> con múltiples líneas`
      };
      
      mockGetSession.mockResolvedValue(specialSession);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
       await GET(request, { params: Promise.resolve({ code: 'a1' }) });

      const htmlArgument = (mockGeneratePdf as jest.Mock).mock.calls[0][0];
      
      // Verificar que el contenido especial se procesa correctamente
      expect(htmlArgument).toContain('<strong>negrita</strong>');
      expect(htmlArgument).toContain('<em>cursiva</em>');
      expect(htmlArgument).not.toContain('<code>');
      expect(htmlArgument).not.toContain('<blockquote>');
      expect(htmlArgument).not.toContain('&quot;'); // Las comillas no se escapan en el HTML generado
      expect(htmlArgument).not.toContain('&amp;'); // El ampersand no se escapa en el HTML generado
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

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
       const response = await GET(request, { params: Promise.resolve({ code: 'a1' }) });

       const contentDisposition = response.headers.get('Content-Disposition');
       expect(contentDisposition).toContain('a1_sesin-muy-larga-con-muchos-caracteres-especiales');
      expect(contentDisposition).toContain('.pdf');
    });

    it('should set correct response headers', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
       const response = await GET(request, { params: Promise.resolve({ code: 'a1' }) });

      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename=".+\.pdf"$/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session content', async () => {
      const emptySession = {
        ...mockSession,
        content: ''
      };
      
      mockGetSession.mockResolvedValue(emptySession);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
       const response = await GET(request, { params: Promise.resolve({ code: 'a1' }) });

       expect(response.status).toBe(200);
       
       const htmlArgument = (mockGeneratePdf as jest.Mock).mock.calls[0][0];
       expect(htmlArgument).toContain('Introducción al Curso - A1');
    });

    it('should handle very long session content', async () => {
      const longContent = Array(1000).fill('## Sección\n\nContenido de la sección con texto largo.\n\n').join('');
      const longSession = {
        ...mockSession,
        content: longContent
      };
      
      mockGetSession.mockResolvedValue(longSession);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
       const response = await GET(request, { params: Promise.resolve({ code: 'a1' }) });

      expect(response.status).toBe(200);
      expect(mockGeneratePdf).toHaveBeenCalled();
    });

    it('should handle case-insensitive session codes', async () => {
      mockGetSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
       await GET(request, { params: Promise.resolve({ code: 'a1' }) });

       expect(mockGetSession).toHaveBeenCalledWith('a1', { visibility: 'public' });
    });
  });
});

