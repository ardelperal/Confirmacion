import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { resolveContentPath } from '@/lib/fsSafe';

export async function POST(request: NextRequest) {
  try {
    const sessionsDir = resolveContentPath('sessions');
    
    // Verificar que el directorio existe
    if (!fs.existsSync(sessionsDir)) {
      return NextResponse.json(
        { error: 'Directorio de sesiones no encontrado' },
        { status: 404 }
      );
    }

    // Obtener todos los archivos .md
    const files = fs.readdirSync(sessionsDir)
      .filter(file => file.endsWith('.md'))
      .filter(file => file.match(/^[A-F][1-4]\.md$/)); // Solo archivos con formato válido

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron sesiones para publicar' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const publishedSessions: string[] = [];
    const errors: string[] = [];

    // Procesar cada sesión
    for (const file of files) {
      try {
        const filePath = resolveContentPath('sessions', file);
        const code = path.basename(file, '.md').toUpperCase();
        
        // Leer y parsear el archivo actual
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data: frontMatter, content } = matter(fileContent);

        // Solo actualizar si no está ya publicada o si necesita actualización
        const needsUpdate = frontMatter.status !== 'published' || !frontMatter.publishedAt;
        
        if (needsUpdate) {
          // Actualizar metadatos para publicación
          const version = frontMatter.status === 'published' ? frontMatter.version || 1 : (frontMatter.version || 1) + 1;
          
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

          publishedSessions.push(code);
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
        errors.push(`Error en ${file}: ${error}`);
      }
    }

    const response: any = {
      ok: true,
      message: `Proceso completado. ${publishedSessions.length} sesiones publicadas.`,
      publishedSessions,
      publishedAt: now
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.message += ` ${errors.length} errores encontrados.`;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error publishing all sessions:', error);
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
