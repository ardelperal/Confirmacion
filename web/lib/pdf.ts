import * as DOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';
import { chromium } from 'playwright';

// Configuración de seguridad
const MAX_HTML_SIZE = 1024 * 1024; // 1MB
const PLAYWRIGHT_TIMEOUT = 30000; // 30 segundos para operaciones de Playwright

// Configuración de DOMPurify para sanitización estricta
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'div', 'span',
    'strong', 'b', 'em', 'i', 'u',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'blockquote', 'pre', 'code'
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?):\/\/|mailto:|tel:|#)/i,
  FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  SANITIZE_DOM: true
};

/**
 * Valida el tamaño del HTML
 * @param html - Contenido HTML a validar
 * @throws Error si excede el límite
 */
export function validateHtmlSize(html: string): void {
  const sizeInBytes = Buffer.byteLength(html, 'utf8');
  if (sizeInBytes > MAX_HTML_SIZE) {
    throw new Error(`HTML content too large: ${sizeInBytes} bytes (max: ${MAX_HTML_SIZE} bytes)`);
  }
}

/**
 * Sanitiza el HTML usando DOMPurify
 * @param html - HTML a sanitizar
 * @returns HTML sanitizado
 */
export function sanitizeHtml(html: string): string {
  try {
    // Crear un DOM virtual para DOMPurify
    const window = new JSDOM('').window;
    
    // Configurar global para DOMPurify
    const originalSelf = (global as any).self;
    (global as any).self = window;
    
    const purify = DOMPurify.default(window as any);
    
    // Sanitizar el HTML
    const cleanHtml = purify.sanitize(html, PURIFY_CONFIG);
    
    // Restaurar el valor original de self
    if (originalSelf !== undefined) {
      (global as any).self = originalSelf;
    } else {
      delete (global as any).self;
    }
    
    // Verificar que el resultado no esté vacío (posible ataque)
    if (!cleanHtml || cleanHtml.trim().length === 0) {
      throw new Error('HTML content was completely sanitized (possible malicious content)');
    }
    
    return cleanHtml;
  } catch (error) {
    console.error('HTML sanitization failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      htmlLength: html.length
    });
    throw new Error('Failed to sanitize HTML content');
  }
}

/**
 * Genera un PDF usando Playwright con validación y sanitización
 * @param html Contenido HTML a convertir
 * @param options Opciones de generación del PDF
 * @returns Buffer del PDF generado
 */
export async function generatePdf(
  html: string,
  options: {
    filename?: string;
    marginTop?: string;
    marginRight?: string;
    marginBottom?: string;
    marginLeft?: string;
    format?: string;
  } = {}
): Promise<Buffer> {
  let browser;
  
  try {
    // 1. Validar tamaño del HTML
    validateHtmlSize(html);
    
    // 2. Sanitizar el HTML
    const sanitizedHtml = sanitizeHtml(html);
    
    // 3. Inicializar Playwright
    browser = await chromium.launch({
      headless: true,
      timeout: PLAYWRIGHT_TIMEOUT
    });
    
    const page = await browser.newPage();
    
    // 4. Configurar el contenido HTML
    await page.setContent(sanitizedHtml, {
      waitUntil: 'networkidle',
      timeout: PLAYWRIGHT_TIMEOUT
    });
    
    // 5. Generar el PDF con las opciones especificadas
    const pdfBuffer = await page.pdf({
      format: (options.format as any) || 'A4',
      margin: {
        top: options.marginTop || '1cm',
        right: options.marginRight || '1cm',
        bottom: options.marginBottom || '1cm',
        left: options.marginLeft || '1cm'
      },
      printBackground: true
    });
    
    if (pdfBuffer.length === 0) {
      throw new Error('Generated PDF is empty');
    }
    
    return pdfBuffer;
    
  } catch (error) {
    // Log del error sin exponer contenido HTML
    console.error('PDF generation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      htmlLength: html.length,
      timestamp: new Date().toISOString()
    });
    
    // Re-lanzar con mensaje genérico para evitar filtración de información
    if (error instanceof Error) {
      if (error.message.includes('too large')) {
        throw new Error('Content too large for PDF generation');
      }
      if (error.message.includes('timeout') || error.name === 'TimeoutError') {
        throw new Error('Request timeout');
      }
      if (error.message.includes('sanitize')) {
        throw new Error('Invalid content for PDF generation');
      }
    }
    
    throw new Error('PDF generation failed');
  } finally {
    // 6. Cerrar el navegador
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Valida que Playwright esté disponible
 * @returns Promise<boolean> true si está disponible
 */
export async function checkPlaywrightHealth(): Promise<boolean> {
  let browser;
  
  try {
    browser = await chromium.launch({
      headless: true,
      timeout: 5000 // 5 segundos para health check
    });
    
    const page = await browser.newPage();
    await page.setContent('<html><body><h1>Test</h1></body></html>');
    
    return true;
  } catch (error) {
    console.error('Playwright health check failed:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Obtiene información sobre los límites de PDF
 */
export const PDF_LIMITS = {
  MAX_HTML_SIZE,
  PLAYWRIGHT_TIMEOUT,
  ALLOWED_TAGS: PURIFY_CONFIG.ALLOWED_TAGS,
  FORBIDDEN_TAGS: PURIFY_CONFIG.FORBID_TAGS
} as const;