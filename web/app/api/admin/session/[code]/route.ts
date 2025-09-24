import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { readContentFile, contentFileExists } from '@/lib/fsSafe';
import { assertValidSlug } from '@/lib/slug';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const resolvedParams = await params;
    const { code } = resolvedParams;
    
    // Validar slug del código
    try {
      assertValidSlug(code.toLowerCase());
    } catch (error) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      );
    }

    const filePath = `sessions/${code}.md`;

    // Verificar si el archivo existe usando helper seguro
    if (!(await contentFileExists(filePath))) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Leer y parsear el archivo usando helper seguro
    const fileContent = await readContentFile(filePath);
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