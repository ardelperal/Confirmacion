import { NextRequest, NextResponse } from 'next/server';
import { getAllSessions } from '@/lib/content-loader';

export async function GET(request: NextRequest) {
  try {
    // Obtener todas las sesiones públicas
    const sessions = await getAllSessions({ visibility: 'public' });

    return NextResponse.json({
      ok: true,
      sessions,
      total: sessions.length
    });

  } catch (error) {
    console.error('Error obteniendo sesiones públicas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}