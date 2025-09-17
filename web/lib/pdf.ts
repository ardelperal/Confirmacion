import DOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';
import { toPDFFromHTML, checkGotenbergHealth as checkHealth, GotenbergError, GOTENBERG_CONFIG } from './gotenberg';

// Configuración de seguridad (mantenemos compatibilidad)
const MAX_HTML_SIZE = 1024 * 1024; // 1MB
const REQUEST_TIMEOUT = 20000; // 20 segundos (para compatibilidad, pero el nuevo cliente usa 15s)

// Configuración de DOMPurify para sanitización estricta
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'em', 'b', 'i', 'u', 'br', 'hr',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'img', 'a', 'blockquote', 'pre', 'code'
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style', 'href', 'src', 'alt', 'title',
    'width', 'height', 'colspan', 'rowspan'
  ],
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
  ALLOW_DATA_ATTR: false,
  SANITIZE_DOM: true,
  KEEP_CONTENT: true
};

/**
 * Valida el tamaño del HTML antes del procesamiento
 * @param html Contenido HTML a validar
 * @throws Error si el HTML excede el tamaño máximo
 */
function validateHtmlSize(html: string): void {
  const sizeInBytes = Buffer.byteLength(html, 'utf8');
  if (sizeInBytes > MAX_HTML_SIZE) {
    throw new Error(`HTML content too large: ${sizeInBytes} bytes (max: ${MAX_HTML_SIZE})`);
  }
}

/**
 * Sanitiza el HTML usando DOMPurify con configuración estricta
 * @param html Contenido HTML a sanitizar
 * @returns HTML sanitizado
 */
function sanitizeHtml(html: string): string {
  try {
    // Crear un DOM virtual para DOMPurify
    const window = new JSDOM('').window;
    const purify = DOMPurify(window as any);
    
    // Sanitizar el HTML
    const cleanHtml = purify.sanitize(html, PURIFY_CONFIG);
    
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
 * Genera un PDF usando Gotenberg con validación y sanitización
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
  try {
    // 1. Validar tamaño del HTML
    validateHtmlSize(html);
    
    // 2. Sanitizar el HTML
    const sanitizedHtml = sanitizeHtml(html);
    
    // 3. Usar el nuevo cliente robusto de Gotenberg
    const pdfUint8Array = await toPDFFromHTML(sanitizedHtml, {
      marginTop: options.marginTop || '20mm',
      marginRight: options.marginRight || '20mm',
      marginBottom: options.marginBottom || '20mm',
      marginLeft: options.marginLeft || '20mm',
      format: options.format || 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      timeout: REQUEST_TIMEOUT,
      retries: 3
    });
    
    return Buffer.from(pdfUint8Array);
    
  } catch (error) {
    // Log del error sin exponer contenido HTML
    console.error('PDF generation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      htmlLength: html.length,
      timestamp: new Date().toISOString()
    });
    
    // Manejar errores específicos del nuevo cliente
    if (error instanceof GotenbergError) {
      if (error.message.includes('size') && error.message.includes('exceeds')) {
        throw new Error('Content too large for PDF generation');
      }
      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        throw new Error('Request timeout');
      }
      if (error.statusCode && error.statusCode >= 400) {
        throw new Error('PDF generation failed');
      }
    }
    
    // Re-lanzar con mensaje genérico para evitar filtración de información
    if (error instanceof Error) {
      if (error.message.includes('too large')) {
        throw new Error('Content too large for PDF generation');
      }
      if (error.message.includes('timeout') || error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      if (error.message.includes('sanitize')) {
        throw new Error('Invalid content for PDF generation');
      }
    }
    
    throw new Error('PDF generation failed');
  }
}

/**
 * Verifica la salud del servicio Gotenberg
 * @returns Promise que resuelve si Gotenberg está disponible
 */
export async function checkGotenbergHealth(): Promise<boolean> {
  try {
    return await checkHealth();
  } catch (error) {
    console.error('Gotenberg health check failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Límites de generación de PDF para seguridad
 */
export const PDF_LIMITS = {
  MAX_HTML_SIZE,
  REQUEST_TIMEOUT,
  GOTENBERG_CONFIG,
  ALLOWED_TAGS: PURIFY_CONFIG.ALLOWED_TAGS,
  FORBIDDEN_TAGS: PURIFY_CONFIG.FORBID_TAGS
} as const;