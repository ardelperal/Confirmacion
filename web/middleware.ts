import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  
  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  // Si no es una ruta protegida, permitir acceso
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // Obtener cookie de autenticación
  const authCookie = request.cookies.get('auth-session')?.value;
  
  if (!authCookie) {
    // Redirigir a login si no hay cookie
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    // Verificar que la cookie contenga role: admin
    const session = JSON.parse(authCookie);
    
    if (session.role !== 'admin') {
      // Redirigir si no es admin
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Usuario autorizado, continuar
    return NextResponse.next();
  } catch (error) {
    // Cookie malformada, redirigir a login
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { error: 'Sesión inválida' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
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