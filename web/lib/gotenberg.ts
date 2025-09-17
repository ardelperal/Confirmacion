import { setTimeout as delay } from "timers/promises";

// Configuración del cliente Gotenberg
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://gotenberg:3000';
const DEFAULT_TIMEOUT = 15000; // 15 segundos
const MAX_RETRIES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'text/html',
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

export interface GotenbergOptions {
  timeout?: number;
  retries?: number;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  format?: string;
  printBackground?: boolean;
  preferCSSPageSize?: boolean;
}

export class GotenbergError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public attempt?: number
  ) {
    super(message);
    this.name = 'GotenbergError';
  }
}

/**
 * Valida el tamaño y tipo de archivo
 */
function validateFile(content: string | Buffer, mimeType: string): void {
  const size = typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length;
  
  if (size > MAX_FILE_SIZE) {
    throw new GotenbergError(`File size ${size} exceeds maximum allowed size ${MAX_FILE_SIZE}`);
  }
  
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new GotenbergError(`MIME type ${mimeType} is not allowed`);
  }
}

/**
 * Realiza una petición HTTP con timeout y reintentos exponenciales
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeout: number = DEFAULT_TIMEOUT,
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new GotenbergError(
          `Gotenberg HTTP ${response.status}: ${errorText}`,
          response.status,
          attempt
        );
      }
      
      return response;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new GotenbergError(`Request timeout after ${timeout}ms`, undefined, attempt);
      }
      
      // No reintentar en el último intento
      if (attempt === maxRetries) {
        break;
      }
      
      // Backoff exponencial: 500ms, 1000ms, 1500ms
      const delayMs = 500 * attempt;
      await delay(delayMs);
    }
  }

  throw lastError ?? new Error('All retry attempts failed');
}

/**
 * Convierte HTML a PDF usando Gotenberg
 */
export async function toPDFFromHTML(
  html: string,
  options: GotenbergOptions = {}
): Promise<Uint8Array> {
  // Validar entrada
  validateFile(html, 'text/html');
  
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    marginTop = '20mm',
    marginRight = '20mm',
    marginBottom = '20mm',
    marginLeft = '20mm',
    format = 'A4',
    printBackground = true,
    preferCSSPageSize = false
  } = options;
  
  // Preparar FormData
  const formData = new FormData();
  formData.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
  
  // Configurar opciones del PDF
  formData.append('marginTop', marginTop);
  formData.append('marginRight', marginRight);
  formData.append('marginBottom', marginBottom);
  formData.append('marginLeft', marginLeft);
  formData.append('format', format);
  formData.append('printBackground', printBackground.toString());
  formData.append('preferCSSPageSize', preferCSSPageSize.toString());
  
  try {
    const response = await fetchWithRetry(
      `${GOTENBERG_URL}/forms/chromium/convert/html`,
      {
        method: 'POST',
        body: formData
      },
      timeout,
      retries
    );
    
    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      throw new GotenbergError('Generated PDF is empty');
    }
    
    return new Uint8Array(arrayBuffer);
    
  } catch (error) {
    if (error instanceof GotenbergError) {
      throw error;
    }
    
    throw new GotenbergError(
      `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Convierte documento Office a PDF usando Gotenberg
 */
export async function toPDFFromOffice(
  fileBuffer: Buffer,
  filename: string,
  options: GotenbergOptions = {}
): Promise<Uint8Array> {
  // Determinar MIME type basado en la extensión
  const ext = filename.toLowerCase().split('.').pop();
  let mimeType: string;
  
  switch (ext) {
    case 'docx':
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      break;
    case 'doc':
      mimeType = 'application/msword';
      break;
    default:
      throw new GotenbergError(`Unsupported file extension: ${ext}`);
  }
  
  // Validar archivo
  validateFile(fileBuffer, mimeType);
  
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES
  } = options;
  
  // Preparar FormData
  const formData = new FormData();
  formData.append('files', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), filename);
  
  try {
    const response = await fetchWithRetry(
      `${GOTENBERG_URL}/forms/libreoffice/convert`,
      {
        method: 'POST',
        body: formData
      },
      timeout,
      retries
    );
    
    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      throw new GotenbergError('Generated PDF is empty');
    }
    
    return new Uint8Array(arrayBuffer);
    
  } catch (error) {
    if (error instanceof GotenbergError) {
      throw error;
    }
    
    throw new GotenbergError(
      `Office to PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Verifica el estado de salud de Gotenberg
 */
export async function checkGotenbergHealth(timeout: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${GOTENBERG_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
    
  } catch (error) {
    return false;
  }
}

/**
 * Obtiene información sobre la configuración del cliente
 */
export const GOTENBERG_CONFIG = {
  url: GOTENBERG_URL,
  timeout: DEFAULT_TIMEOUT,
  maxRetries: MAX_RETRIES,
  maxFileSize: MAX_FILE_SIZE,
  allowedMimeTypes: ALLOWED_MIME_TYPES
} as const;