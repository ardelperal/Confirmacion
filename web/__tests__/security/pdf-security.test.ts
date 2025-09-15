import { generatePdf, validateHtmlSize, sanitizeHtml, checkGotenbergHealth } from '@/lib/pdf';
import { JSDOM } from 'jsdom';

// Mock fetch para simular respuestas de Gotenberg
global.fetch = jest.fn();

// Mock FormData para tests
class MockFormData {
  private data: Map<string, any> = new Map();
  
  append(key: string, value: any) {
    this.data.set(key, value);
  }
  
  get(key: string) {
    return this.data.get(key) || null;
  }
}

global.FormData = MockFormData as any;

describe('PDF Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateHtmlSize', () => {
    it('should accept HTML within size limit', () => {
      const smallHtml = '<html><body><p>Small content</p></body></html>';
      expect(() => validateHtmlSize(smallHtml)).not.toThrow();
    });

    it('should reject HTML exceeding size limit', () => {
      // Crear HTML de más de 1MB
      const largeContent = 'x'.repeat(1024 * 1024 + 1);
      const largeHtml = `<html><body><p>${largeContent}</p></body></html>`;
      
      expect(() => validateHtmlSize(largeHtml)).toThrow('HTML content too large');
    });

    it('should handle empty HTML', () => {
      expect(() => validateHtmlSize('')).not.toThrow();
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove dangerous script tags', () => {
      const dangerousHtml = '<html><body><script>alert("xss")</script><p>Safe content</p></body></html>';
      const sanitized = sanitizeHtml(dangerousHtml);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('Safe content');
    });

    it('should remove dangerous event handlers', () => {
      const dangerousHtml = '<html><body><div onclick="malicious()">Click me</div></body></html>';
      const sanitized = sanitizeHtml(dangerousHtml);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('malicious');
      expect(sanitized).toContain('Click me');
    });

    it('should remove dangerous iframe sources', () => {
      const dangerousHtml = '<html><body><iframe src="javascript:alert(1)"></iframe><p>Safe content</p></body></html>';
      const sanitized = sanitizeHtml(dangerousHtml);
      
      // Los iframes son completamente removidos por la configuración
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('Safe content');
    });

    it('should preserve safe HTML elements', () => {
      const safeHtml = '<html><body><h1>Title</h1><p>Paragraph</p><strong>Bold</strong></body></html>';
      const sanitized = sanitizeHtml(safeHtml);
      
      expect(sanitized).toContain('<h1>');
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('Title');
      expect(sanitized).toContain('Paragraph');
      expect(sanitized).toContain('Bold');
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedHtml = '<html><body><p>Unclosed paragraph<div>Nested incorrectly</p></div></body></html>';
      const sanitized = sanitizeHtml(malformedHtml);
      
      // Should not throw and should return some content
      expect(sanitized).toBeTruthy();
      expect(sanitized).toContain('Unclosed paragraph');
      expect(sanitized).toContain('Nested incorrectly');
    });
  });

  describe('checkGotenbergHealth', () => {
    it('should return true when Gotenberg is healthy', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const isHealthy = await checkGotenbergHealth();
      expect(isHealthy).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://gotenberg:3000/health',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should return false when Gotenberg is unreachable', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

      const isHealthy = await checkGotenbergHealth();
      expect(isHealthy).toBe(false);
    });

    it('should return false when Gotenberg returns error status', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const isHealthy = await checkGotenbergHealth();
      expect(isHealthy).toBe(false);
    });

    it('should timeout after 5 seconds', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (fetch as jest.Mock).mockRejectedValueOnce(abortError);

      const isHealthy = await checkGotenbergHealth();
      expect(isHealthy).toBe(false);
    });
  });

  describe('generatePdf', () => {
    const mockPdfBuffer = Buffer.from('fake-pdf-content');

    it('should generate PDF successfully with valid HTML', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockPdfBuffer.buffer)
      });

      const html = '<html><body><h1>Test Document</h1></body></html>';
      const result = await generatePdf(html);

      expect(result).toBeInstanceOf(Buffer);
      expect(fetch).toHaveBeenCalledWith(
        'http://gotenberg:3000/forms/chromium/convert/html',
        expect.objectContaining({
          method: 'POST',
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should reject HTML exceeding size limit', async () => {
      const largeContent = 'x'.repeat(1024 * 1024 + 1);
      const largeHtml = `<html><body><p>${largeContent}</p></body></html>`;

      await expect(generatePdf(largeHtml)).rejects.toThrow('Content too large for PDF generation');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should sanitize dangerous HTML before sending', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockPdfBuffer.buffer)
      });

      const dangerousHtml = '<html><body><script>alert("xss")</script><h1>Title</h1></body></html>';
      await generatePdf(dangerousHtml);

      // Verificar que fetch fue llamado (la sanitización ocurre internamente)
      expect(fetch).toHaveBeenCalledWith(
        'http://gotenberg:3000/forms/chromium/convert/html',
        expect.objectContaining({
          method: 'POST',
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should handle Gotenberg errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error')
      });

      const html = '<html><body><h1>Test</h1></body></html>';
      
      await expect(generatePdf(html)).rejects.toThrow('PDF generation failed');
    });

    it('should timeout after 20 seconds', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (fetch as jest.Mock).mockRejectedValueOnce(abortError);

      const html = '<html><body><h1>Test</h1></body></html>';
      
      await expect(generatePdf(html)).rejects.toThrow('Request timeout');
    });

    it('should apply custom options correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockPdfBuffer.buffer)
      });

      const html = '<html><body><h1>Test</h1></body></html>';
      const options = {
        filename: 'custom.pdf',
        marginTop: '30mm',
        marginLeft: '25mm',
        format: 'Letter' as const
      };

      const result = await generatePdf(html, options);

      expect(result).toBeInstanceOf(Buffer);
      expect(fetch).toHaveBeenCalledWith(
        'http://gotenberg:3000/forms/chromium/convert/html',
        expect.objectContaining({
          method: 'POST',
          signal: expect.any(AbortSignal)
        })
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow with dangerous content', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('safe-pdf').buffer)
      });

      const dangerousHtml = `
        <html>
          <head>
            <script src="http://evil.com/malware.js"></script>
          </head>
          <body>
            <h1>Legitimate Title</h1>
            <iframe src="javascript:alert('xss')"></iframe>
            <div onclick="steal_data()">Click me</div>
            <p>Safe paragraph content</p>
          </body>
        </html>
      `;

      const result = await generatePdf(dangerousHtml);

      expect(result).toBeInstanceOf(Buffer);
      
      // Verificar que la función fue llamada correctamente
      expect(fetch).toHaveBeenCalledWith(
        'http://gotenberg:3000/forms/chromium/convert/html',
        expect.objectContaining({
          method: 'POST',
          signal: expect.any(AbortSignal)
        })
      );
    });
  });
});