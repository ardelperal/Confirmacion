import DOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

// Configuración de seguridad
const MAX_HTML_SIZE = 1024 * 1024; // 1MB
const REQUEST_TIMEOUT = 20000; // 20 segundos
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://gotenberg:3000';

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
 * Realiza una petición HTTP con timeout
 * @param url URL de destino
 * @param options Opciones de fetch
 * @param timeoutMs Timeout en milisegundos
 * @returns Promise con la respuesta
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeoutMs: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
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
    
    // 3. Preparar el formulario para Gotenberg
    const formData = new FormData();
    
    // Crear archivo HTML temporal
    const htmlBlob = new Blob([sanitizedHtml], { type: 'text/html' });
    formData.append('files', htmlBlob, 'index.html');
    
    // Configurar opciones del PDF
    formData.append('marginTop', options.marginTop || '20mm');
    formData.append('marginRight', options.marginRight || '20mm');
    formData.append('marginBottom', options.marginBottom || '20mm');
    formData.append('marginLeft', options.marginLeft || '20mm');
    formData.append('format', options.format || 'A4');
    formData.append('printBackground', 'true');
    formData.append('preferCSSPageSize', 'false');
    
    // 4. Realizar petición a Gotenberg con timeout
    const response = await fetchWithTimeout(
      `${GOTENBERG_URL}/forms/chromium/convert/html`,
      {
        method: 'POST',
        body: formData
      },
      REQUEST_TIMEOUT
    );
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Gotenberg conversion failed: ${response.status} - ${errorText}`);
    }
    
    // 5. Obtener el PDF como buffer
    const pdfBuffer = await response.arrayBuffer();
    
    if (pdfBuffer.byteLength === 0) {
      throw new Error('Generated PDF is empty');
    }
    
    return Buffer.from(pdfBuffer);
    
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
 * Valida que Gotenberg esté disponible
 * @returns Promise<boolean> true si está disponible
 */
export async function checkGotenbergHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${GOTENBERG_URL}/health`,
      { method: 'GET' },
      5000 // 5 segundos para health check
    );
    return response.ok;
  } catch (error) {
    console.error('Gotenberg health check failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: GOTENBERG_URL
    });
    return false;
  }
}

/**
 * Obtiene información sobre los límites de Gotenberg
 */
export const PDF_LIMITS = {
  MAX_HTML_SIZE,
  REQUEST_TIMEOUT,
  ALLOWED_TAGS: PURIFY_CONFIG.ALLOWED_TAGS,
  FORBIDDEN_TAGS: PURIFY_CONFIG.FORBID_TAGS
} as const;