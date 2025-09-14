import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { isAdmin } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { SessionFrontMatter } from '@/types';

const SESSIONS_DIR = path.join(process.cwd(), 'content', 'sessions');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; action: string }> }
) {
  const { code, action } = await params;
  
  try {
    // Verificar autenticación
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    const sessionPath = path.join(SESSIONS_DIR, `${code}.md`);

    // Verificar que el archivo existe
    try {
      await fs.access(sessionPath);
    } catch {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Leer el archivo actual
    const fileContent = await fs.readFile(sessionPath, 'utf-8');
    const { data: frontMatter, content } = matter(fileContent);
    const currentFrontMatter = frontMatter as SessionFrontMatter;

    let updatedFrontMatter: SessionFrontMatter;
    let auditAction: 'save' | 'publish' | 'unpublish' | 'delete';

    switch (action) {
      case 'publish':
        updatedFrontMatter = {
          ...currentFrontMatter,
          status: 'published',
          publishedAt: new Date().toISOString(),
          editedBy: 'parroco',
          editedAt: new Date().toISOString(),
          version: (currentFrontMatter.version || 0) + 1
        };
        auditAction = 'publish';
        break;

      case 'unpublish':
        updatedFrontMatter = {
          ...currentFrontMatter,
          status: 'draft',
          editedBy: 'parroco',
          editedAt: new Date().toISOString(),
          version: (currentFrontMatter.version || 0) + 1
        };
        auditAction = 'unpublish';
        break;

      case 'archive':
        updatedFrontMatter = {
          ...currentFrontMatter,
          status: 'archived',
          editedBy: 'parroco',
          editedAt: new Date().toISOString(),
          version: (currentFrontMatter.version || 0) + 1
        };
        auditAction = 'unpublish'; // Usar unpublish para archivado
        break;

      case 'delete':
        // Eliminar archivo
        await fs.unlink(sessionPath);
        await logAuditAction('parroco', 'delete', code, currentFrontMatter.version);
        return NextResponse.json({ success: true, message: 'Sesión eliminada' });

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    // Guardar archivo actualizado
    const updatedContent = matter.stringify(content, updatedFrontMatter);
    await fs.writeFile(sessionPath, updatedContent, 'utf-8');
    
    // Registrar en auditoría
    await logAuditAction('parroco', auditAction, code, updatedFrontMatter.version);

    return NextResponse.json({
      success: true,
      message: getSuccessMessage(action),
      session: {
        code,
        frontMatter: updatedFrontMatter
      }
    });

  } catch (error) {
    console.error(`Error en acción ${action} para sesión ${code}:`, error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function getSuccessMessage(action: string): string {
  const messages = {
    publish: 'Sesión publicada correctamente',
    unpublish: 'Publicación retirada correctamente',
    archive: 'Sesión archivada correctamente',
    delete: 'Sesión eliminada correctamente'
  };
  
  return messages[action as keyof typeof messages] || 'Acción completada';
}