import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, generateToken } from '@/lib/auth';
import { AuthUser } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Contraseña requerida' },
        { status: 400 }
      );
    }

    // Verificar contraseña
    const isValid = await verifyAdminPassword(password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    // Crear usuario admin
    const user: AuthUser = {
      id: 'admin',
      username: 'parroco',
      role: 'admin'
    };

    // Generar token
    const token = generateToken(user);

    // Crear respuesta con cookie
    const response = NextResponse.json(
      { 
        success: true, 
        user: { username: user.username, role: user.role } 
      },
      { status: 200 }
    );

    // Configurar cookie httpOnly
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 horas
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