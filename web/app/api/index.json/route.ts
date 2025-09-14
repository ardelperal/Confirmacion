import { NextResponse } from 'next/server';
import { buildIndex } from '@/lib/content-loader';

export async function GET() {
  try {
    // Siempre usar scope público para la API pública
    const index = await buildIndex({ visibility: 'public' });
    
    return NextResponse.json({
      success: true,
      data: index,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error building search index:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar el índice de búsqueda',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Configurar cache para el índice
export const revalidate = 300; // 5 minutos