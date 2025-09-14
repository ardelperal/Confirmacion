import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación de admin
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    const sessionsDir = path.join(process.cwd(), '..', 'data', 'content', 'sessions');
    
    // Verificar si el directorio existe
    try {
      await fs.access(sessionsDir);
    } catch {
      return NextResponse.json({ sessions: [] });
    }

    const files = await fs.readdir(sessionsDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    const sessions = await Promise.all(
      mdFiles.map(async (file) => {
        try {
          const filePath = path.join(sessionsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const { data } = matter(content);
          
          return {
            code: data.code || path.basename(file, '.md'),
            title: data.title || 'Sin título',
            status: data.status || 'draft',
            version: data.version || 1,
            editedAt: data.editedAt,
            publishedAt: data.publishedAt,
            editedBy: data.editedBy
          };
        } catch (error) {
          console.error(`Error reading ${file}:`, error);
          return null;
        }
      })
    );

    // Filtrar sesiones nulas y ordenar por código
    const validSessions = sessions
      .filter(session => session !== null)
      .sort((a, b) => a!.code.localeCompare(b!.code));

    return NextResponse.json({ sessions: validSessions });
  } catch (error) {
    console.error('Error loading sessions:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}