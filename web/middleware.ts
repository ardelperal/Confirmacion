import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, getAppConfig } from '@/lib/auth';

// Rutas que requieren autenticación
const PROTECTED_ROUTES = ['/admin', '/api/admin'];

// Rutas públicas (siempre accesibles)
const PUBLIC_ROUTES = [
  '/',
  '/modulo',
  '/sesion',
  '/api/export',
  '/api/index.json',
  '/login'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const config = getAppConfig();
  
  // Si está en modo READ-only, redirigir /admin a la página principal
  if (config.readOnly && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  // Si no es una ruta protegida, permitir acceso
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // Obtener token de las cookies
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    // Redirigir a login si no hay token
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verificar token
  const user = verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    // Token inválido o usuario no es admin
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
  
  // Usuario autenticado, permitir acceso
  return NextResponse.next();
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