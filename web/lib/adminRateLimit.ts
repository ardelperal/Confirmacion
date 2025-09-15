import { NextRequest } from 'next/server';
import { initRateLimiter, RATE_LIMIT_CONFIGS, createRateLimitResponse } from './rateLimit';

// Inicializar rate limiter para rutas admin
const adminRateLimiter = initRateLimiter(RATE_LIMIT_CONFIGS.ADMIN_API);

/**
 * Middleware de rate limiting para rutas /api/admin/*
 * Aplica límite de 30 requests por minuto por IP para métodos POST/PUT/PATCH/DELETE
 */
export async function checkAdminRateLimit(request: NextRequest): Promise<Response | null> {
  const method = request.method;
  
  // Solo aplicar rate limiting a métodos de modificación
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null; // No aplicar rate limiting
  }
  
  // Verificar rate limiting
  const rateLimitResult = await adminRateLimiter.check(request);
  
  if (!rateLimitResult.allowed) {
    // Crear respuesta 429 con headers apropiados
    const response = createRateLimitResponse(
      rateLimitResult,
      'Demasiadas operaciones administrativas. Intenta de nuevo más tarde.'
    );
    
    // Establecer el límite correcto en el header
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIGS.ADMIN_API.max.toString());
    
    return response;
  }
  
  return null; // Permitir continuar
}

/**
 * Higher-order function para envolver handlers de rutas admin con rate limiting
 */
export function withAdminRateLimit(handler: (request: NextRequest, context?: any) => Promise<Response>) {
  return async (request: NextRequest, context?: any): Promise<Response> => {
    // Verificar rate limiting primero
    const rateLimitResponse = await checkAdminRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Si pasa el rate limiting, ejecutar el handler original
    return handler(request, context);
  };
}