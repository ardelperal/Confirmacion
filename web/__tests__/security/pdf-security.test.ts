import { generatePdf, validateHtmlSize, sanitizeHtml, checkPlaywrightHealth } from '@/lib/pdf';
import { JSDOM } from 'jsdom';

// Mock Playwright para simular respuestas
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn()
  }
}));

import { chromium } from 'playwright';

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

  describe('checkPlaywrightHealth', () => {
    it('should return true when Playwright is working', async () => {
      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined)
      };
      
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const isHealthy = await checkPlaywrightHealth();
      expect(isHealthy).toBe(true);
      expect(chromium.launch).toHaveBeenCalledWith({
        headless: true,
        timeout: 5000
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should return false when Playwright fails to launch', async () => {
      (chromium.launch as jest.Mock).mockRejectedValue(new Error('Launch failed'));

      const isHealthy = await checkPlaywrightHealth();
      expect(isHealthy).toBe(false);
    });

    it('should return false when page creation fails', async () => {
      const mockBrowser = {
        newPage: jest.fn().mockRejectedValue(new Error('Page creation failed')),
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const isHealthy = await checkPlaywrightHealth();
      expect(isHealthy).toBe(false);
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('generatePdf', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should generate PDF successfully with valid HTML', async () => {
      const mockPdf = Buffer.from('PDF content');
      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockResolvedValue(mockPdf)
      };
      
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const validHtml = '<html><body><h1>Test</h1></body></html>';
      const result = await generatePdf(validHtml);

      expect(result).toEqual(mockPdf);
      expect(chromium.launch).toHaveBeenCalledWith({
        headless: true,
        timeout: 30000
      });
      expect(mockPage.setContent).toHaveBeenCalledWith('<h1>Test</h1>', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        },
        printBackground: true
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should throw error when HTML is too large', async () => {
      const largeHtml = 'x'.repeat(5 * 1024 * 1024 + 1); // > 5MB
      
      await expect(generatePdf(largeHtml)).rejects.toThrow('Content too large for PDF generation');
    });

    it('should throw error when browser launch fails', async () => {
      (chromium.launch as jest.Mock).mockRejectedValue(new Error('Launch failed'));

      const validHtml = '<html><body><h1>Test</h1></body></html>';
      
      await expect(generatePdf(validHtml)).rejects.toThrow('PDF generation failed');
    });

    it('should close browser even when PDF generation fails', async () => {
      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockRejectedValue(new Error('PDF generation failed'))
      };
      
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const validHtml = '<html><body><h1>Test</h1></body></html>';
      
      await expect(generatePdf(validHtml)).rejects.toThrow('PDF generation failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow with dangerous content', async () => {
      const mockPdf = Buffer.from('safe-pdf');
      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockResolvedValue(mockPdf)
      };
      
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

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
      
      // Verificar que Playwright fue usado correctamente
      expect(chromium.launch).toHaveBeenCalledWith({
        headless: true,
        timeout: expect.any(Number)
      });
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.not.stringContaining('<script>'),
        expect.objectContaining({
          waitUntil: 'networkidle',
          timeout: expect.any(Number)
        })
      );
      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
          printBackground: true
        })
      );
    });
  });
});