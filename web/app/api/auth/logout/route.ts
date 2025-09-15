import { NextRequest, NextResponse } from 'next/server';
import { createClearCookieHeader } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Crear respuesta exitosa
    const response = NextResponse.json({ success: true });

    // Borrar cookie JWT segura
    response.headers.set('Set-Cookie', createClearCookieHeader());

    return response;
  } catch (error) {
    console.error('Error en logout:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}