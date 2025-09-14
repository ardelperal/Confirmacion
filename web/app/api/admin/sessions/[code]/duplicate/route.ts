import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSession } from '@/lib/content-loader';
import fs from 'fs';
import path from 'path';

interface DuplicateRequestBody {
  newCode: string;
  newTitle?: string;
}

/**
 * API para duplicar una sesión existente
 * POST /api/admin/sessions/[code]/duplicate
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { code } = await params;
    const sessionCode = code.toUpperCase();
    
    // Obtener datos del cuerpo de la petición
    const body: DuplicateRequestBody = await request.json();
    const { newCode, newTitle } = body;
    
    if (!newCode) {
      return NextResponse.json({ error: 'Código de nueva sesión requerido' }, { status: 400 });
    }

    const newSessionCode = newCode.toUpperCase();
    
    // Verificar que la sesión original existe
    const originalSession = await getSession(sessionCode, { visibility: 'admin' });
    if (!originalSession) {
      return NextResponse.json({ error: 'Sesión original no encontrada' }, { status: 404 });
    }

    // Verificar que la nueva sesión no existe
    const existingSession = await getSession(newSessionCode, { visibility: 'admin' });
    if (existingSession) {
      return NextResponse.json({ error: 'Ya existe una sesión con ese código' }, { status: 409 });
    }

    // Crear el contenido de la nueva sesión
    const newFrontMatter = {
      ...originalSession.frontMatter,
      code: newSessionCode,
      title: newTitle || `${originalSession.frontMatter.title} (Copia)`,
      status: 'draft' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      publishedAt: null,
      editedAt: new Date().toISOString()
    };

    // Generar el contenido markdown completo
    const yamlFrontMatter = `---
code: "${newFrontMatter.code}"
title: "${newFrontMatter.title}"
module: "${newFrontMatter.module}"
duration: ${newFrontMatter.duration}
objective: "${newFrontMatter.objective}"
materials:
${newFrontMatter.materials.map(m => `  - "${m}"`).join('\n')}
biblical_references:
${newFrontMatter.biblical_references.map(ref => `  - "${ref}"`).join('\n')}
catechism_references:
${newFrontMatter.catechism_references.map(ref => `  - "${ref}"`).join('\n')}
key_terms:
${Object.entries(newFrontMatter.key_terms).map(([key, value]) => `  ${key}: "${value}"`).join('\n')}
status: "${newFrontMatter.status}"
created_at: "${newFrontMatter.created_at}"
updated_at: "${newFrontMatter.updated_at}"
version: ${newFrontMatter.version}
publishedAt: ${newFrontMatter.publishedAt}
editedAt: "${newFrontMatter.editedAt}"
---

`;

    const fullContent = yamlFrontMatter + originalSession.content;

    // Guardar el archivo
    const sessionsDir = path.join(process.cwd(), 'content', 'sessions');
    const newFilePath = path.join(sessionsDir, `${newSessionCode}.md`);
    
    await fs.promises.writeFile(newFilePath, fullContent, 'utf8');

    return NextResponse.json({
      success: true,
      message: 'Sesión duplicada exitosamente',
      newCode: newSessionCode,
      newTitle: newFrontMatter.title
    });

  } catch (error) {
    console.error('Error duplicando sesión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}