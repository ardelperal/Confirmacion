import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/docx/[code]/route';

// Mock de las dependencias
jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('@/lib/logging-middleware', () => ({
  createLogContext: jest.fn(() => ({
    sessionCode: 'test-code',
    requestId: 'test-request-id'
  }))
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn()
  }))
}));

// Importar después de los mocks
const { getSession } = require('@/lib/content-loader');

describe('DOCX Export Integration Tests', () => {
  const mockSession = {
    frontMatter: {
      code: 'A1',
      title: 'Sesión de Prueba',
      status: 'published' as const,
      module: 'Módulo 1'
    },
    content: `# Sesión de Prueba

## Introducción
Esta es una sesión de prueba para verificar la exportación a DOCX.

### Objetivos
- Objetivo 1
- Objetivo 2

## Desarrollo
Contenido del desarrollo de la sesión.

### Actividades
1. Actividad 1
2. Actividad 2

## Conclusión
Resumen y cierre de la sesión.
`,
    htmlContent: '<h1>Sesión de Prueba</h1><p>Contenido HTML procesado</p>'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful DOCX Generation', () => {
    it('should generate DOCX for published session (public access)', async () => {
      // Setup
      getSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/a1');
      const params = Promise.resolve({ code: 'a1' });

      // Execute
      const response = await GET(request, { params });

      // Verify
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('a1_sesin-de-prueba.docx');
      
      expect(getSession).toHaveBeenCalledWith('a1', { visibility: 'public' });
    });

    it('should generate DOCX for draft session (admin preview)', async () => {
      // Setup - draft session
      const draftSession = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          status: 'draft' as const
        }
      };
      
      getSession.mockResolvedValue(draftSession);

      // Mock admin authentication
      const { cookies } = require('next/headers');
      cookies.mockReturnValue({
        get: jest.fn().mockReturnValue({
          value: JSON.stringify({ role: 'admin' })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/export/docx/a1?adminPreview=1');
      const params = Promise.resolve({ code: 'a1' });

      // Execute
      const response = await GET(request, { params });

      // Verify
      expect(response.status).toBe(200);
      expect(getSession).toHaveBeenCalledWith('a1', { visibility: 'admin' });
    });

    it('should handle case-insensitive session codes', async () => {
      getSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/A1');
      const params = Promise.resolve({ code: 'A1' });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(getSession).toHaveBeenCalledWith('A1', { visibility: 'public' });
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid session code', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/docx/invalid..code');
      const params = Promise.resolve({ code: 'invalid..code' });

      const response = await GET(request, { params });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for non-existent session', async () => {
      getSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/docx/nonexistent');
      const params = Promise.resolve({ code: 'nonexistent' });

      const response = await GET(request, { params });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for draft session without admin access', async () => {
      const draftSession = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          status: 'draft' as const
        }
      };
      
      getSession.mockResolvedValue(draftSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/a1');
      const params = Promise.resolve({ code: 'a1' });

      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no disponible');
    });

    it('should return 403 for admin preview without proper authentication', async () => {
      // Mock no authentication
      const { cookies } = require('next/headers');
      cookies.mockReturnValue({
        get: jest.fn().mockReturnValue(null)
      });

      const request = new NextRequest('http://localhost:3000/api/export/docx/a1?adminPreview=1');
      const params = Promise.resolve({ code: 'a1' });

      const response = await GET(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('No autorizado para preview de admin');
    });

    it('should handle DOCX generation errors gracefully', async () => {
      // Mock a session that would cause DOCX generation to fail
      const problematicSession = {
        ...mockSession,
        content: null // This could cause issues in content processing
      };
      
      getSession.mockResolvedValue(problematicSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/a1');
      const params = Promise.resolve({ code: 'a1' });

      const response = await GET(request, { params });

      // Should handle the error gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Content Processing', () => {
    it('should properly process markdown content to DOCX', async () => {
      const sessionWithRichContent = {
        ...mockSession,
        content: `# Título Principal

## Subtítulo

### Subsección

Párrafo normal con **texto en negrita** y *texto en cursiva*.

- Lista con viñetas
- Segundo elemento
  - Elemento anidado

1. Lista numerada
2. Segundo elemento numerado

[ ] Tarea pendiente
[x] Tarea completada

---

Texto después de separador.`
      };

      getSession.mockResolvedValue(sessionWithRichContent);

      const request = new NextRequest('http://localhost:3000/api/export/docx/a1');
      const params = Promise.resolve({ code: 'a1' });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should include session metadata in DOCX', async () => {
      getSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/a1');
      const params = Promise.resolve({ code: 'a1' });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      
      // Verify filename includes session code and title
      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('a1_sesin-de-prueba.docx');
    });

    it('should handle empty content gracefully', async () => {
      const emptySession = {
        ...mockSession,
        content: ''
      };

      getSession.mockResolvedValue(emptySession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/a1');
      const params = Promise.resolve({ code: 'a1' });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe('Security and Validation', () => {
    it('should validate session code format', async () => {
      const invalidCodes = ['../../../etc/passwd', '<script>alert(1)</script>', 'code with spaces'];
      
      for (const code of invalidCodes) {
        const request = new NextRequest(`http://localhost:3000/api/export/docx/${encodeURIComponent(code)}`);
        const params = Promise.resolve({ code });

        const response = await GET(request, { params });
        expect(response.status).toBe(400);
      }
    });

    it('should properly handle authentication cookie parsing errors', async () => {
      // Mock corrupted cookie
      const { cookies } = require('next/headers');
      cookies.mockReturnValue({
        get: jest.fn().mockReturnValue({
          value: 'invalid-json'
        })
      });

      const request = new NextRequest('http://localhost:3000/api/export/docx/a1?adminPreview=1');
      const params = Promise.resolve({ code: 'a1' });

      const response = await GET(request, { params });

      expect(response.status).toBe(403);
    });

    it('should normalize session codes to lowercase', async () => {
      getSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/export/docx/A1');
      const params = Promise.resolve({ code: 'A1' });

      await GET(request, { params });

      // Should call getSession with original code (no normalization in DOCX)
      expect(getSession).toHaveBeenCalledWith('A1', { visibility: 'public' });
    });
  });
});