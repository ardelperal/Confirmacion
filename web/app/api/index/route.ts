import { NextRequest, NextResponse } from 'next/server';
import { buildIndex } from '@/lib/content-loader';

export async function GET(request: NextRequest) {
  try {
    // Generar índice público
    const index = await buildIndex();

    return NextResponse.json(index, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600', // Cache por 5-10 minutos
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error generando índice público:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}