import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    // Validar formato del código
    if (!code.match(/^[A-F][1-6]$/)) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      );
    }

    const sessionsDir = path.join(process.cwd(), 'content', 'sessions');
    const filePath = path.join(sessionsDir, `${code}.md`);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Leer y parsear el archivo
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data: frontMatter, content } = matter(fileContent);

    const session = {
      code: frontMatter.code || code,
      title: frontMatter.title || 'Sin título',
      content: fileContent,
      status: frontMatter.status || 'draft',
      version: frontMatter.version || 1,
      editedAt: frontMatter.editedAt,
      publishedAt: frontMatter.publishedAt,
      editedBy: frontMatter.editedBy
    };

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}