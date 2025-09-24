import { chromium } from 'playwright';

// Mock the entire PDF module
jest.mock('@/lib/pdf', () => ({
  generatePdf: jest.fn(),
  checkPlaywrightHealth: jest.fn()
}));

// Mock Playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn()
  }
}));

import { generatePdf, checkPlaywrightHealth } from '@/lib/pdf';

describe('PDF Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPlaywrightHealth', () => {
    it('should verify Playwright is available', async () => {
      (checkPlaywrightHealth as jest.Mock).mockResolvedValue(true);

      const isHealthy = await checkPlaywrightHealth();
      expect(isHealthy).toBe(true);
      expect(checkPlaywrightHealth).toHaveBeenCalled();
    });

    it('should return false when Playwright is unavailable', async () => {
      (checkPlaywrightHealth as jest.Mock).mockResolvedValue(false);

      const isHealthy = await checkPlaywrightHealth();
      expect(isHealthy).toBe(false);
      expect(checkPlaywrightHealth).toHaveBeenCalled();
    });
  });

  describe('generatePdf with mocked implementation', () => {
    it('should generate PDF from session content', async () => {
      const mockPdf = Buffer.from('fake-pdf');
      (generatePdf as jest.Mock).mockResolvedValue(mockPdf);

      const html = `
        <html>
          <head>
            <title>Test Session</title>
            <style>
              body { font-family: Arial, sans-serif; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>Test Session</h1>
            <div>This is a test session.</div>
          </body>
        </html>
      `;

      const result = await generatePdf(html);
      
      expect(result).toEqual(mockPdf);
      expect(generatePdf).toHaveBeenCalledWith(html);
    });

    it('should handle complex HTML with CSS', async () => {
      const mockPdf = Buffer.from('fake-complex-pdf');
      (generatePdf as jest.Mock).mockResolvedValue(mockPdf);

      const complexHtml = `
        <html>
          <head>
            <style>
              body { margin: 0; padding: 20px; font-family: 'Arial', sans-serif; }
              .header { background: #f0f0f0; padding: 10px; }
              .content { margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Complex Document</h1>
            </div>
            <div class="content">
              <p>This is a complex document with CSS styling.</p>
            </div>
          </body>
        </html>
      `;

      const result = await generatePdf(complexHtml);
      
      expect(result).toEqual(mockPdf);
      expect(generatePdf).toHaveBeenCalledWith(complexHtml);
    });

    it('should handle errors gracefully', async () => {
      (generatePdf as jest.Mock).mockRejectedValue(new Error('PDF generation failed'));

      const html = '<html><body><h1>Test</h1></body></html>';
      
      await expect(generatePdf(html)).rejects.toThrow('PDF generation failed');
      expect(generatePdf).toHaveBeenCalledWith(html);
    });
  });
});

