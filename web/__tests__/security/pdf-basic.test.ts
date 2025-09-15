import { sanitizeHtml, validateHtmlSize } from '@/lib/pdf';

describe('PDF Basic Security Tests', () => {
  describe('validateHtmlSize', () => {
    it('should accept small HTML', () => {
      const smallHtml = '<html><body><p>Small content</p></body></html>';
      expect(() => validateHtmlSize(smallHtml)).not.toThrow();
    });

    it('should reject large HTML', () => {
      // Crear HTML de más de 1MB
      const largeContent = 'x'.repeat(1024 * 1024 + 1);
      const largeHtml = `<html><body><p>${largeContent}</p></body></html>`;
      
      expect(() => validateHtmlSize(largeHtml)).toThrow();
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const dangerousHtml = '<html><body><script>alert("xss")</script><p>Safe content</p></body></html>';
      const sanitized = sanitizeHtml(dangerousHtml);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Safe content');
    });

    it('should preserve safe content', () => {
      const safeHtml = '<html><body><h1>Title</h1><p>Paragraph</p></body></html>';
      const sanitized = sanitizeHtml(safeHtml);
      
      expect(sanitized).toContain('Title');
      expect(sanitized).toContain('Paragraph');
    });
  });
});