import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth, generateToken } from '@/lib/auth';
import { createSecureCookieHeader } from '@/lib/jwt';
import { AuthUser } from '@/types';

/**
 * POST /api/auth/refresh
 * Renueva el token JWT si está válido y cerca de expirar
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación actual
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }
    
    // Solo renovar si el token necesita refresh
    if (!authResult.needsRefresh) {
      return NextResponse.json(
        { 
          message: 'Token aún válido, no requiere renovación',
          user: authResult.user
        },
        { status: 200 }
      );
    }
    
    // Generar nuevo token
    const newToken = generateToken(authResult.user);
    
    // Crear respuesta con nueva cookie segura
    const response = NextResponse.json(
      {
        message: 'Token renovado exitosamente',
        user: authResult.user,
        refreshed: true
      },
      { status: 200 }
    );
    
    // Establecer nueva cookie segura (15 minutos)
    response.headers.set('Set-Cookie', createSecureCookieHeader(newToken, 900));
    
    return response;
    
  } catch (error) {
    console.error('Error en refresh de token:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/refresh
 * Verifica el estado del token actual
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { 
          authenticated: false,
          needsRefresh: false,
          error: authResult.error || 'No autenticado'
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        authenticated: true,
        user: authResult.user,
        needsRefresh: authResult.needsRefresh || false,
        error: authResult.error
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error verificando estado de token:', error);
    
    return NextResponse.json(
      { 
        authenticated: false,
        needsRefresh: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}