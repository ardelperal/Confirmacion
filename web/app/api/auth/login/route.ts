import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Verificar contraseña usando el sistema dual de autenticación
    const isValidPassword = await verifyAdminPassword(password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    // Crear respuesta exitosa
    const response = NextResponse.json({ success: true });

    // Establecer cookie httpOnly con rol admin
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookies.set('auth-session', JSON.stringify({ role: 'admin' }), {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}