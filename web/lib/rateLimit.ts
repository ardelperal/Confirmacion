import { NextRequest } from 'next/server';
// Importación condicional del logger para evitar errores en tests
let logger: any;
try {
  logger = require('./logger').logger;
} catch (e) {
  // Logger no disponible (ej. en tests)
  logger = { info: () => {}, warn: () => {}, error: () => {} };
}

// Interfaces para el rate limiter
export interface RateLimitConfig {
  windowMs: number; // Ventana de tiempo en milisegundos
  max: number; // Máximo número de requests por ventana
  keyFn?: (req: NextRequest) => string; // Función para generar la clave (por defecto IP)
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // Segundos hasta que se puede intentar de nuevo
  remaining?: number; // Requests restantes en la ventana actual
  resetTime?: number; // Timestamp cuando se resetea la ventana
}

export interface RateLimiter {
  check(req: NextRequest): Promise<RateLimitResult>;
}

// Implementación en memoria usando Map
class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, number[]>();
  private config: RateLimitConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Solo iniciar cleanup automático si no estamos en tests
    if (process.env.NODE_ENV !== 'test') {
      // Limpiar entradas expiradas cada 5 minutos
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  async check(req: NextRequest): Promise<RateLimitResult> {
    const key = this.config.keyFn ? this.config.keyFn(req) : this.getClientIP(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Obtener timestamps de requests previos
    let timestamps = this.store.get(key) || [];
    
    // Filtrar timestamps dentro de la ventana deslizante
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
    // Verificar si se excede el límite
    if (timestamps.length >= this.config.max) {
      const oldestTimestamp = Math.min(...timestamps);
      const retryAfter = Math.ceil((oldestTimestamp + this.config.windowMs - now) / 1000);
      
      // Log del evento de bloqueo
      if (logger?.warn) {
        logger.warn('Rate limit exceeded', {
          key,
          ip: this.getClientIP(req),
          path: req.nextUrl.pathname,
          method: req.method,
          userAgent: req.headers.get('user-agent'),
          attempts: timestamps.length,
          windowMs: this.config.windowMs,
          maxAttempts: this.config.max
        });
      }
      
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        resetTime: oldestTimestamp + this.config.windowMs
      };
    }
    
    // Agregar el timestamp actual
    timestamps.push(now);
    this.store.set(key, timestamps);
    
    return {
      allowed: true,
      remaining: this.config.max - timestamps.length,
      resetTime: now + this.config.windowMs
    };
  }

  private getClientIP(req: NextRequest): string {
    // Intentar obtener la IP real del cliente
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    // Fallback a IP de conexión (NextRequest no tiene .ip directamente)
    return 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Usar Array.from para compatibilidad con versiones anteriores de TypeScript
    const entries = Array.from(this.store.entries());
    for (const [key, timestamps] of entries) {
      const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
      
      if (validTimestamps.length === 0) {
        this.store.delete(key);
      } else if (validTimestamps.length !== timestamps.length) {
        this.store.set(key, validTimestamps);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

// Implementación con Redis (opcional)
class RedisRateLimiter implements RateLimiter {
  private config: RateLimitConfig;
  private redis: any; // Tipo genérico para evitar dependencia directa

  constructor(config: RateLimitConfig, redisClient: any) {
    this.config = config;
    this.redis = redisClient;
  }

  async check(req: NextRequest): Promise<RateLimitResult> {
    const key = this.config.keyFn ? this.config.keyFn(req) : this.getClientIP(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const redisKey = `ratelimit:${key}`;

    try {
      // Usar pipeline para operaciones atómicas
      const pipeline = this.redis.pipeline();
      
      // Remover timestamps expirados
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      
      // Contar requests actuales
      pipeline.zcard(redisKey);
      
      // Agregar timestamp actual
      pipeline.zadd(redisKey, now, now);
      
      // Establecer expiración
      pipeline.expire(redisKey, Math.ceil(this.config.windowMs / 1000));
      
      const results = await pipeline.exec();
      const currentCount = results[1][1]; // Resultado del zcard
      
      if (currentCount >= this.config.max) {
        // Obtener el timestamp más antiguo para calcular retryAfter
        const oldestTimestamp = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES');
        const retryAfter = oldestTimestamp.length > 0 
          ? Math.ceil((parseInt(oldestTimestamp[1]) + this.config.windowMs - now) / 1000)
          : Math.ceil(this.config.windowMs / 1000);
        
        // Log del evento de bloqueo
        logger.warn('Rate limit exceeded (Redis)', {
          key,
          ip: this.getClientIP(req),
          path: req.nextUrl.pathname,
          method: req.method,
          userAgent: req.headers.get('user-agent'),
          attempts: currentCount,
          windowMs: this.config.windowMs,
          maxAttempts: this.config.max
        });
        
        return {
          allowed: false,
          retryAfter,
          remaining: 0,
          resetTime: parseInt(oldestTimestamp[1]) + this.config.windowMs
        };
      }
      
      return {
        allowed: true,
        remaining: this.config.max - currentCount - 1, // -1 porque ya agregamos el actual
        resetTime: now + this.config.windowMs
      };
      
    } catch (error) {
      logger.error('Redis rate limiter error, falling back to allow', { error, key });
      // En caso de error con Redis, permitir la request (fail-open)
      return { allowed: true };
    }
  }

  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    return 'unknown';
  }
}

// Factory function para crear el rate limiter apropiado
// Importación condicional de Redis
let Redis: any;
try {
  Redis = require('ioredis');
} catch (e) {
  // Redis no disponible - esto es normal si no se instala ioredis
  Redis = null;
}

export function initRateLimiter(config: RateLimitConfig): RateLimiter {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl && Redis) {
    try {
      // Intentar usar Redis si está disponible
      const redis = new Redis(redisUrl);
      
      logger.info('Rate limiter initialized with Redis backend');
      return new RedisRateLimiter(config, redis);
    } catch (error) {
      logger.warn('Failed to initialize Redis rate limiter, falling back to memory', { error });
    }
  }
  
  // Log solo si logger está disponible (no en tests)
  if (logger?.info) {
    logger.info('Rate limiter initialized with memory backend');
  }
  return new MemoryRateLimiter(config);
}

// Configuraciones predefinidas
export const RATE_LIMIT_CONFIGS = {
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5 // 5 intentos por IP
  },
  ADMIN_API: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30 // 30 requests por IP
  }
} as const;

// Helper para crear respuesta 429
export function createRateLimitResponse(result: RateLimitResult, message = 'Too Many Requests'): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': '0', // Se debe establecer externamente
    'X-RateLimit-Remaining': (result.remaining || 0).toString(),
  });
  
  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
  
  if (result.resetTime) {
    headers.set('X-RateLimit-Reset', Math.floor(result.resetTime / 1000).toString());
  }
  
  return new Response(
    JSON.stringify({
      error: message,
      retryAfter: result.retryAfter
    }),
    {
      status: 429,
      headers
    }
  );
}