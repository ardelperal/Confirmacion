import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { getContentRoot, resolveContentPath } from '@/lib/fsSafe';

export async function GET() {
  try {
    // Verificar que el directorio de contenido existe y es accesible
    const contentDir = getContentRoot();
    await fs.access(contentDir);
    
    // Verificar que el directorio de sesiones existe
    const sessionsDir = resolveContentPath('sessions');
    await fs.access(sessionsDir);
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Content directory not accessible'
      },
      { status: 503 }
    );
  }
}
