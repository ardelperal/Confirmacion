import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';

export async function POST(request: NextRequest) {
  try {
    // Verificar rate limiting
    const rateLimitResponse = await checkAdminRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    const { code, markdown } = await request.json();
    
    // Validar código
    if (!code || !code.match(/^[A-F][1-6]$/)) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      );
    }

    if (!markdown) {
      return NextResponse.json(
        { error: 'Contenido requerido' },
        { status: 400 }
      );
    }

    const sessionsDir = path.join(process.cwd(), 'content', 'sessions');
    const filePath = path.join(sessionsDir, `${code}.md`);
    
    // Crear directorio si no existe
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }

    // Parsear el contenido actual para obtener/actualizar metadatos
    let frontMatter: any = {};
    let version = 1;
    
    try {
      const { data } = matter(markdown);
      frontMatter = data;
      version = (frontMatter.version || 0) + 1;
    } catch (error) {
      // Si no se puede parsear, usar valores por defecto
      console.warn('Error parsing front matter, using defaults');
    }

    // Actualizar metadatos
    const now = new Date().toISOString();
    const updatedFrontMatter = {
      ...frontMatter,
      code,
      version,
      editedBy: 'parroco',
      editedAt: now,
      status: frontMatter.status || 'draft'
    };

    // Reconstruir el archivo con front matter actualizado
    const { content } = matter(markdown);
    const updatedMarkdown = matter.stringify(content, updatedFrontMatter);

    // Guardar archivo
    fs.writeFileSync(filePath, updatedMarkdown, 'utf8');

    // Registrar en auditoría
    await logAudit({
      ts: now,
      user: 'parroco',
      action: 'save',
      code,
      version
    });

    return NextResponse.json({ 
      ok: true, 
      version,
      message: 'Sesión guardada exitosamente'
    });
  } catch (error) {
    console.error('Error saving session:', error);
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
    const contentDir = path.join(process.cwd(), 'content');
    const auditPath = path.join(contentDir, '.audit.log');
    
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