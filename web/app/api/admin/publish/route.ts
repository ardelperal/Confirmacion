import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { resolveContentPath } from '@/lib/fsSafe';

export async function POST(request: NextRequest) {
  try {
    // Verificar rate limiting
    const rateLimitResponse = await checkAdminRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    const { code } = await request.json();
    
    // Validar código
    if (!code || !code.match(/^[A-F][1-4]$/)) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      );
    }

    const filePath = resolveContentPath('sessions', `${code}.md`);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Leer y parsear el archivo actual
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data: frontMatter, content } = matter(fileContent);

    // Actualizar metadatos para publicación
    const now = new Date().toISOString();
    const version = (frontMatter.version || 1) + 1;
    
    const updatedFrontMatter = {
      ...frontMatter,
      status: 'published',
      publishedAt: now,
      version,
      editedBy: 'parroco',
      editedAt: now
    };

    // Reconstruir y guardar el archivo
    const updatedMarkdown = matter.stringify(content, updatedFrontMatter);
    fs.writeFileSync(filePath, updatedMarkdown, 'utf8');

    // Registrar en auditoría
    await logAudit({
      ts: now,
      user: 'parroco',
      action: 'publish',
      code,
      version
    });

    return NextResponse.json({ 
      ok: true, 
      version,
      message: 'Sesión publicada exitosamente'
    });
  } catch (error) {
    console.error('Error publishing session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function logAudit(entry: {
  ts: string;
  user: string;
  action: string;
  code: string;
  version: number;
}) {
  try {
    const auditPath = resolveContentPath('.audit.log');
    const contentDir = path.dirname(auditPath);
    
    // Crear directorio si no existe
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    // Agregar entrada al log (formato JSONL)
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(auditPath, logLine, 'utf8');
  } catch (error) {
    console.error('Error logging audit:', error);
    // No fallar la operación principal por errores de auditoría
  }
}
