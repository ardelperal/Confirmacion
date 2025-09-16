import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, generateToken } from '@/lib/auth';
import { createSecureCookieHeader } from '@/lib/jwt';
import { logAuthAttempt } from '@/lib/logging-middleware';
import { createLogContext } from '@/lib/logger';
import { initRateLimiter, RATE_LIMIT_CONFIGS, createRateLimitResponse } from '@/lib/rateLimit';

// Inicializar rate limiter para login
const loginRateLimiter = initRateLimiter(RATE_LIMIT_CONFIGS.LOGIN);

export async function POST(request: NextRequest) {
  const logContext = createLogContext(request);
  
  try {
    // Verificar rate limiting
    const rateLimitResult = await loginRateLimiter.check(request);
    
    if (!rateLimitResult.allowed) {
      // Crear respuesta 429 con headers apropiados
      const response = createRateLimitResponse(
        rateLimitResult,
        'Demasiados intentos de login. Intenta de nuevo más tarde.'
      );
      
      // Establecer el límite correcto en el header
      response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIGS.LOGIN.max.toString());
      
      return response;
    }
    
    const { username, password } = await request.json();
    
    // Verificar que se proporcionen los campos requeridos
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username y password son requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar que el username sea 'admin'
    if (username !== 'admin') {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      );
    }

    // Verificar contraseña usando el sistema dual de autenticación
    const isValidPassword = await verifyAdminPassword(password);
    
    if (!isValidPassword) {
      // Log intento fallido
      logAuthAttempt(false, {
        ...logContext,
        username: 'admin',
        reason: 'invalid_password'
      });
      
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    // Log intento exitoso
    logAuthAttempt(true, {
      ...logContext,
      username: 'admin'
    });

    // Generar JWT token con configuración endurecida
    const user = {
      id: 'admin',
      username: 'admin',
      role: 'admin' as const
    };
    
    const token = await generateToken(user);
    
    // Crear respuesta exitosa
    const response = NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

    // Establecer cookie segura con JWT endurecido (15 minutos)
    response.headers.set('Set-Cookie', createSecureCookieHeader(token, 900));

    return response;
  } catch (error: any) {
    // Log error de sistema
    logAuthAttempt(false, {
      ...logContext,
      username: 'admin',
      reason: 'system_error',
      error: error.message
    });
    
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}