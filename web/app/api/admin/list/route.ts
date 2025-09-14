import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getAllSessions } from '@/lib/content-loader';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener todas las sesiones con visibilidad admin
    const sessions = await getAllSessions({ visibility: 'admin' });

    return NextResponse.json({
      ok: true,
      sessions,
      total: sessions.length
    });

  } catch (error) {
    console.error('Error obteniendo lista de sesiones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}