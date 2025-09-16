// Configuración JWT
const JWT_ALGORITHM = 'HS256'; // Algoritmo seguro
const DEFAULT_ACCESS_TTL = 15 * 60; // 15 minutos en segundos
const CLOCK_TOLERANCE = 60; // ±60 segundos de tolerancia
const REFRESH_THRESHOLD = 5 * 60; // 5 minutos antes de expirar

// Tipos
export interface JWTPayload {
  id: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface SignOptions {
  expiresIn?: number; // En segundos
}

export interface VerifyResult {
  payload: JWTPayload | null;
  needsRefresh?: boolean;
  error?: string;
}

// Obtener secretos JWT desde variables de entorno
function getJWTSecrets(): { current: string; previous?: string } {
  const current = process.env.JWT_SECRET;
  const previous = process.env.JWT_SECRET_PREV;
  
  if (!current) {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno');
  }
  
  return { current, previous };
}

// Funciones JWT nativas usando Web Crypto API (compatible con edge runtime)
function base64UrlEncode(data: string): string {
  try {
    // Usar TextEncoder en lugar de Buffer para edge runtime
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    
    // Evitar crear arrays grandes que causen problemas de memoria
    let base64 = '';
    const chunkSize = 8192; // Procesar en chunks de 8KB
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      base64 += btoa(String.fromCharCode(...chunk));
    }
    
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    throw new Error('Error codificando base64url: ' + error);
  }
}

function base64UrlDecode(data: string): string {
  try {
    // Agregar padding si es necesario
    const padded = data + '='.repeat((4 - data.length % 4) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = atob(base64);
    
    // Evitar crear arrays grandes que causen problemas de memoria
    const byteArray = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      byteArray[i] = bytes.charCodeAt(i);
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(byteArray);
  } catch (error) {
    throw new Error('Error decodificando base64url: ' + error);
  }
}

async function createJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = {
    alg: JWT_ALGORITHM,
    typ: 'JWT'
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  
  // Crear HMAC SHA-256 signature usando Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = new Uint8Array(signatureBuffer);
  const base64Signature = btoa(String.fromCharCode(...signatureArray));
  const signature = base64Signature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${data}.${signature}`;
}

async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token malformado');
  }
  
  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  
  // Verificar signature usando Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  // Decodificar la signature recibida
  const paddedSignature = signature + '='.repeat((4 - signature.length % 4) % 4);
  const base64Signature = paddedSignature.replace(/-/g, '+').replace(/_/g, '/');
  const signatureBytes = atob(base64Signature);
  const signatureBuffer = new Uint8Array([...signatureBytes].map(c => c.charCodeAt(0)));
  
  const isValid = await crypto.subtle.verify('HMAC', cryptoKey, signatureBuffer, messageData);
  
  if (!isValid) {
    throw new Error('Signature inválida');
  }
  
  // Decodificar payload
  const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
  
  // Verificar expiración con clock tolerance
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < (now - CLOCK_TOLERANCE)) {
    throw new Error('Token expirado');
  }
  
  // Verificar issued at con clock tolerance
  if (payload.iat && payload.iat > (now + CLOCK_TOLERANCE)) {
    throw new Error('Token emitido en el futuro');
  }
  
  return payload;
}

/**
 * Firma un token de acceso JWT con TTL corto
 * @param payload - Datos del usuario
 * @param options - Opciones de firma (expiresIn por defecto 15m)
 * @returns Token JWT firmado
 */
export async function signAccessToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>, 
  options: SignOptions = {}
): Promise<string> {
  const { current } = getJWTSecrets();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresIn || DEFAULT_ACCESS_TTL;
  
  const tokenPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };
  
  return await createJWT(tokenPayload, current);
}

/**
 * Verifica un token JWT con rotación suave de secretos y clock skew
 * @param token - Token JWT a verificar
 * @returns Resultado de verificación con payload y flags
 */
export async function verifyAccessToken(token: string): Promise<VerifyResult> {
  const { current, previous } = getJWTSecrets();
  
  // Intentar verificar con el secreto actual
  try {
    const decoded = await verifyJWT(token, current);
    
    // Verificar si necesita refresh (cerca de expirar)
    const needsRefresh = checkNeedsRefresh(decoded);
    
    return {
      payload: decoded,
      needsRefresh
    };
  } catch (currentError) {
    // Si falla con secreto actual, intentar con secreto anterior (rotación suave)
    if (previous) {
      try {
        const decoded = await verifyJWT(token, previous);
        
        // Token válido con secreto anterior - forzar reemisión
        return {
          payload: decoded,
          needsRefresh: true, // Forzar refresh para migrar al nuevo secreto
          error: 'Token firmado con secreto anterior, requiere renovación'
        };
      } catch (previousError) {
        return {
          payload: null,
          error: `Token inválido: ${(currentError as Error).message}`
        };
      }
    }
    
    return {
      payload: null,
      error: `Token inválido: ${(currentError as Error).message}`
    };
  }
}

/**
 * Verifica si un token necesita ser renovado (cerca de expirar)
 * @param payload - Payload decodificado del JWT
 * @returns true si necesita refresh
 */
function checkNeedsRefresh(payload: JWTPayload): boolean {
  if (!payload.exp) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - now;
  
  // Necesita refresh si expira en menos de 5 minutos
  return timeUntilExpiry <= REFRESH_THRESHOLD;
}

/**
 * Extrae el token JWT de las cookies de la request
 * @param cookieHeader - Header de cookies de la request
 * @returns Token JWT o null si no existe
 */
export function extractTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return cookies['admin_access'] || null;
}

/**
 * Genera las opciones de cookie segura para el token JWT
 * @param maxAge - Tiempo de vida en segundos (por defecto 15 minutos)
 * @returns String con las opciones de cookie
 */
export function getSecureCookieOptions(maxAge: number = 900): string {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const options = [
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Lax'
  ];
  
  // Solo agregar Secure en producción (requiere HTTPS)
  if (isProduction) {
    options.push('Secure');
  }
  
  return options.join('; ');
}

/**
 * Crea el header Set-Cookie completo para el token JWT
 * @param token - Token JWT
 * @param maxAge - Tiempo de vida en segundos
 * @returns Header Set-Cookie completo
 */
export function createSecureCookieHeader(token: string, maxAge: number = 900): string {
  const cookieOptions = getSecureCookieOptions(maxAge);
  return `admin_access=${token}; ${cookieOptions}`;
}

/**
 * Crea el header Set-Cookie para eliminar el token (logout)
 * @returns Header Set-Cookie para eliminar la cookie
 */
export function createClearCookieHeader(): string {
  return 'admin_access=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
}