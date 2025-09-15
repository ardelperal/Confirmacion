import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/jwt';

// Rutas que requieren autenticación
const PROTECTED_ROUTES = ['/admin', '/api/admin'];

// Rutas públicas (siempre accesibles)
const PUBLIC_ROUTES = [
  '/',
  '/modulo',
  '/sesion',
  '/api/export',
  '/api/index.json',
  '/login',
  '/api/auth/login',
  '/api/auth/refresh'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  // Si no es una ruta protegida, permitir acceso
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // Extraer JWT token de cookies seguras
  const cookieHeader = request.headers.get('cookie');
  const token = extractTokenFromCookies(cookieHeader);
  
  if (!token) {
    // Redirigir a login si no hay token
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { error: 'No autorizado - Token requerido' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verificar JWT token con endurecimiento
  const verificationResult = verifyAccessToken(token);
  
  if (!verificationResult.payload || verificationResult.error) {
    // Token inválido o expirado
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { error: verificationResult.error || 'Token inválido' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verificar rol de admin
  if (verificationResult.payload.role !== 'admin') {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { error: 'Acceso denegado - Se requiere rol admin' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Si el token necesita refresh (cerca de expirar), agregar header
  const response = NextResponse.next();
  if (verificationResult.needsRefresh) {
    response.headers.set('X-Token-Refresh-Needed', 'true');
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};