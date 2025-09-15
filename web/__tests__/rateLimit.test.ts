import { NextRequest } from 'next/server';
import { initRateLimiter, RATE_LIMIT_CONFIGS } from '@/lib/rateLimit';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';

// Mock para simular requests
function createMockRequest(method: string = 'POST', ip: string = '127.0.0.1'): NextRequest {
  const url = 'http://localhost:3000/api/admin/test';
  const request = new NextRequest(url, { method });
  
  // Simular IP en headers
  Object.defineProperty(request, 'ip', {
    value: ip,
    writable: false
  });
  
  // Simular headers de IP
  request.headers.set('x-forwarded-for', ip);
  request.headers.set('x-real-ip', ip);
  
  return request;
}

describe('Rate Limiting System', () => {
  beforeEach(() => {
    // Limpiar cualquier estado previo
    jest.clearAllMocks();
  });

  describe('Login Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const rateLimiter = initRateLimiter(RATE_LIMIT_CONFIGS.LOGIN);
      const request = createMockRequest('POST', '192.168.1.1');
      
      // Primer request debería ser permitido
      const result = await rateLimiter.check(request);
      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should block requests after exceeding limit', async () => {
      const rateLimiter = initRateLimiter({
        windowMs: 60000, // 1 minuto para test rápido
        max: 2, // Límite bajo para test
        keyFn: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
      
      const request = createMockRequest('POST', '192.168.1.2');
      
      // Primeros 2 requests deberían ser permitidos
      let result = await rateLimiter.check(request);
      expect(result.allowed).toBe(true);
      
      result = await rateLimiter.check(request);
      expect(result.allowed).toBe(true);
      
      // Tercer request debería ser bloqueado
      result = await rateLimiter.check(request);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should differentiate between different IPs', async () => {
      const rateLimiter = initRateLimiter({
        windowMs: 60000,
        max: 2, // Aumentar límite para permitir más requests
        keyFn: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
      
      const request1 = createMockRequest('POST', '192.168.1.3');
      const request2 = createMockRequest('POST', '192.168.1.4');
      
      // Ambas IPs deberían tener su propio límite
      let result1 = await rateLimiter.check(request1);
      let result2 = await rateLimiter.check(request2);
      
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      
      // Segunda request de ambas IPs debería ser permitida
      result1 = await rateLimiter.check(request1);
      result2 = await rateLimiter.check(request2);
      
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      
      // Tercera request de la primera IP debería ser bloqueada
      result1 = await rateLimiter.check(request1);
      expect(result1.allowed).toBe(false);
      
      // Pero la segunda IP aún debería funcionar para una tercera request
      result2 = await rateLimiter.check(request2);
      expect(result2.allowed).toBe(false); // También debería estar bloqueada ya que ya hizo 2
    });
  });

  describe('Admin Rate Limiting', () => {
    it('should only apply to modification methods', async () => {
      const getRequest = createMockRequest('GET', '192.168.1.5');
      const postRequest = createMockRequest('POST', '192.168.1.5');
      const putRequest = createMockRequest('PUT', '192.168.1.5');
      const deleteRequest = createMockRequest('DELETE', '192.168.1.5');
      
      // GET no debería ser limitado
      const getResult = await checkAdminRateLimit(getRequest);
      expect(getResult).toBeNull();
      
      // POST, PUT, DELETE deberían ser verificados
      const postResult = await checkAdminRateLimit(postRequest);
      const putResult = await checkAdminRateLimit(putRequest);
      const deleteResult = await checkAdminRateLimit(deleteRequest);
      
      // Primeras requests deberían pasar (retornar null)
      expect(postResult).toBeNull();
      expect(putResult).toBeNull();
      expect(deleteResult).toBeNull();
    });

    it('should return 429 response when limit exceeded', async () => {
      // Crear muchas requests para exceder el límite
      const requests = Array.from({ length: 35 }, () => 
        createMockRequest('POST', '192.168.1.6')
      );
      
      let blockedResponse = null;
      
      // Hacer requests hasta que una sea bloqueada
      for (const request of requests) {
        const result = await checkAdminRateLimit(request);
        if (result) {
          blockedResponse = result;
          break;
        }
      }
      
      // Debería haber una respuesta bloqueada
      expect(blockedResponse).not.toBeNull();
      if (blockedResponse) {
        expect(blockedResponse.status).toBe(429);
        expect(blockedResponse.headers.get('Retry-After')).toBeTruthy();
        expect(blockedResponse.headers.get('X-RateLimit-Limit')).toBe('30');
      }
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include proper headers in 429 response', async () => {
      const rateLimiter = initRateLimiter({
        windowMs: 60000,
        max: 1,
        keyFn: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
      
      const request = createMockRequest('POST', '192.168.1.7');
      
      // Primera request para agotar el límite
      await rateLimiter.check(request);
      
      // Segunda request debería ser bloqueada
      const result = await rateLimiter.check(request);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });
  });

  describe('Memory Storage', () => {
    it('should clean up expired entries', async () => {
      const rateLimiter = initRateLimiter({
        windowMs: 100, // 100ms para test rápido
        max: 1,
        keyFn: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
      
      const request = createMockRequest('POST', '192.168.1.8');
      
      // Primera request
      let result = await rateLimiter.check(request);
      expect(result.allowed).toBe(true);
      
      // Segunda request inmediata debería ser bloqueada
      result = await rateLimiter.check(request);
      expect(result.allowed).toBe(false);
      
      // Esperar a que expire la ventana
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Ahora debería ser permitida de nuevo
      result = await rateLimiter.check(request);
      expect(result.allowed).toBe(true);
    });
  });
});

// Test de integración con rutas reales
describe('Rate Limiting Integration', () => {
  it('should integrate properly with admin routes', async () => {
    const request = createMockRequest('POST', '192.168.1.9');
    
    // Verificar que checkAdminRateLimit funciona correctamente
    const result = await checkAdminRateLimit(request);
    
    // Primera request debería pasar
    expect(result).toBeNull();
  });
});