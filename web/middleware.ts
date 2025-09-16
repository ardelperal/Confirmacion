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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('MIDDLEWARE EJECUTADO - Pathname:', pathname);
  
  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  console.log('MIDDLEWARE - Is protected route:', isProtectedRoute);
  
  // Si no es una ruta protegida, permitir acceso
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // Extraer JWT token de cookies seguras
  const cookieHeader = request.headers.get('cookie');
  console.log('Middleware - Cookie header:', cookieHeader);
  const token = extractTokenFromCookies(cookieHeader);
  console.log('Middleware - Extracted token:', token ? 'Token found' : 'No token');
  
  if (!token) {
    console.log('Middleware - No token, redirecting to login');
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
  const verificationResult = await verifyAccessToken(token);
  console.log('Middleware - Token verification result:', {
    hasPayload: !!verificationResult.payload,
    error: verificationResult.error,
    role: verificationResult.payload?.role
  });
  
  if (!verificationResult.payload || verificationResult.error) {
    console.log('Middleware - Token invalid, redirecting to login');
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