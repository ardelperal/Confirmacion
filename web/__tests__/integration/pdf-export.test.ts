import { NextRequest } from 'next/server';
import { GET } from '../../app/api/export/pdf/[code]/route';
import { getSession } from '../../lib/sessions';
import { generatePdf, checkGotenbergHealth } from '../../lib/gotenberg';
import { assertValidSlug } from '../../lib/utils';
import { createLogContext, logDownload } from '../../lib/logging-middleware';
import fs from 'fs';

// Mock de las dependencias
jest.mock('@/lib/content-loader', () => ({
  getSession: jest.fn()
}));

jest.mock('@/lib/pdf', () => ({
  generatePdf: jest.fn(),
  checkGotenbergHealth: jest.fn()
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

jest.mock('../../lib/utils', () => ({
  assertValidSlug: jest.fn()
}));

jest.mock('../../lib/logging-middleware', () => ({
  createLogContext: jest.fn(() => ({ ip: '127.0.0.1', userAgent: 'test' })),
  logDownload: jest.fn()
}));

jest.mock('fs');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn()
  }))
}));

// Importar después de los mocks
const { getSession } = require('@/lib/content-loader');
const { generatePdf, checkGotenbergHealth } = require('@/lib/pdf');
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

describe('PDF Export Integration Tests', () => {
  const mockSession = {
    frontMatter: {
      code: 'A1',
      title: 'Sesión de Prueba',
      status: 'published' as const,
      module: 'Módulo 1'
    },
    content: `# Sesión de Prueba

## Introducción
Esta es una sesión de prueba para verificar la exportación a PDF.

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
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock successful health check
    (checkGotenbergHealth as jest.Mock).mockResolvedValue(true);
    
    // Mock successful PDF generation
    (generatePdf as jest.Mock).mockResolvedValue(Buffer.from('fake-pdf-content'));
    
    // Mock assertValidSlug to not throw
    (assertValidSlug as jest.Mock).mockImplementation(() => {});
    
    // Mock fs.readFileSync for CSS
    const fs = require('fs');
    (fs.readFileSync as jest.Mock).mockReturnValue('/* mock css */');
  });

  describe('Successful PDF Generation', () => {
    it('should generate PDF for published session (public access)', async () => {
      // Setup
      getSession.mockResolvedValue(mockSession);
      const mockPdfBuffer = Buffer.from('fake-pdf-content');
      generatePdf.mockResolvedValue(mockPdfBuffer);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
      const params = Promise.resolve({ code: 'a1' });

      // Execute
      const response = await GET(request, { params });

      // Verify
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('a1_sesin-de-prueba.pdf');
      
      expect(getSession).toHaveBeenCalledWith('a1', { visibility: 'public' });
      expect(generatePdf).toHaveBeenCalledWith(
        expect.stringContaining('<!DOCTYPE html>'),
        expect.objectContaining({
          filename: 'a1_sesin-de-prueba.pdf'
        })
      );
    });

    it('should generate PDF for draft session (admin preview)', async () => {
      // Setup - draft session
      const draftSession = {
        ...mockSession,
        frontMatter: {
          ...mockSession.frontMatter,
          status: 'draft' as const
        }
      };
      
      getSession.mockResolvedValue(draftSession);
      const mockPdfBuffer = Buffer.from('fake-pdf-content');
      generatePdf.mockResolvedValue(mockPdfBuffer);

      // Mock admin authentication
      const { cookies } = require('next/headers');
      cookies.mockReturnValue({
        get: jest.fn().mockReturnValue({
          value: JSON.stringify({ role: 'admin' })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1?adminPreview=1');
      const params = Promise.resolve({ code: 'a1' });

      // Execute
      const response = await GET(request, { params });

      // Verify
      expect(response.status).toBe(200);
      expect(getSession).toHaveBeenCalledWith('a1', { visibility: 'admin' });
    });

    it('should include CSS styles in generated HTML', async () => {
      // Setup
      getSession.mockResolvedValue(mockSession);
      const mockPdfBuffer = Buffer.from('fake-pdf-content');
      generatePdf.mockResolvedValue(mockPdfBuffer);
      
      // Mock CSS content with actual styles
      const fs = require('fs');
      (fs.readFileSync as jest.Mock).mockReturnValue(`
        body { font-family: Arial, sans-serif; }
        h1, h2, h3 { font-family: 'Noto Sans', sans-serif; }
        .print-only { display: block; }
        @media print { .no-print { display: none; } }
      `);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
      const params = Promise.resolve({ code: 'a1' });

      // Execute
      await GET(request, { params });

      // Verify that generatePdf was called with HTML containing styles
      expect(generatePdf).toHaveBeenCalledWith(
        expect.stringContaining('<style>'),
        expect.any(Object)
      );
      
      const htmlContent = (generatePdf as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain('font-family: Arial, sans-serif');
      expect(htmlContent).toContain('font-family: \'Noto Sans\'');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid session code', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/pdf/invalid..code');
      const params = Promise.resolve({ code: 'invalid..code' });

      const response = await GET(request, { params });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Código de sesión inválido');
    });

    it('should return 404 for non-existent session', async () => {
      getSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/nonexistent');
      const params = Promise.resolve({ code: 'nonexistent' });

      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Sesión no encontrada');
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

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
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

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1?adminPreview=1');
      const params = Promise.resolve({ code: 'a1' });

      const response = await GET(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('No autorizado para preview de admin');
    });

    it('should handle PDF generation errors gracefully', async () => {
      getSession.mockResolvedValue(mockSession);
      generatePdf.mockRejectedValue(new Error('PDF generation failed'));

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
      const params = Promise.resolve({ code: 'a1' });

      const response = await GET(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Error interno del servidor');
    });

    it('should handle missing CSS file gracefully', async () => {
      // Setup
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      
      // Mock fs.readFileSync to throw error (simulating missing CSS file)
      const fs = require('fs');
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      // Execute
      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
      const response = await GET(request, { params: Promise.resolve({ code: 'a1' }) });

      // Should still succeed without CSS
      expect(response.status).toBe(200);
      expect(generatePdf).toHaveBeenCalled();
    });
  });

  describe('Content Processing', () => {
    it('should properly convert markdown content to HTML', async () => {
      getSession.mockResolvedValue(mockSession);
      const mockPdfBuffer = Buffer.from('fake-pdf-content');
      generatePdf.mockResolvedValue(mockPdfBuffer);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
      const params = Promise.resolve({ code: 'a1' });

      await GET(request, { params });

      const htmlContent = (generatePdf as jest.Mock).mock.calls[0][0];
      
      // Verify HTML structure
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="es">');
      expect(htmlContent).toContain('<title>Sesión de Prueba - A1</title>');
      expect(htmlContent).toContain('Sesión de Prueba');
    });

    it('should include session metadata in HTML', async () => {
      getSession.mockResolvedValue(mockSession);
      const mockPdfBuffer = Buffer.from('fake-pdf-content');
      generatePdf.mockResolvedValue(mockPdfBuffer);

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1');
      const params = Promise.resolve({ code: 'a1' });

      await GET(request, { params });

      const htmlContent = (generatePdf as jest.Mock).mock.calls[0][0];
      
      expect(htmlContent).toContain('A1');
      expect(htmlContent).toContain('Sesión de Prueba');
    });
  });

  describe('Security and Validation', () => {
    it('should validate session code format', async () => {
      const invalidCodes = ['../../../etc/passwd', '<script>alert(1)</script>', 'code with spaces'];
      
      for (const code of invalidCodes) {
        const request = new NextRequest(`http://localhost:3000/api/export/pdf/${encodeURIComponent(code)}`);
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

      const request = new NextRequest('http://localhost:3000/api/export/pdf/a1?adminPreview=1');
      const params = Promise.resolve({ code: 'a1' });

      const response = await GET(request, { params });

      expect(response.status).toBe(403);
    });
  });
});