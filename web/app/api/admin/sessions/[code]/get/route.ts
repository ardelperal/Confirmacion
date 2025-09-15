import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/content-loader';
import { verifyAdminAuth } from '@/lib/auth';
import { readContentFile } from '@/lib/fsSafe';
import { assertValidSlug } from '@/lib/slug';

interface RouteParams {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verificar autenticación de admin
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { code } = await params;

    // Validar slug del código
    try {
      assertValidSlug(code.toLowerCase());
    } catch (error) {
      return NextResponse.json(
        { error: 'Código de sesión inválido' },
        { status: 400 }
      );
    }

    // Intentar obtener la sesión
    const session = await getSession(code, { visibility: 'admin' });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Obtener el contenido raw del archivo usando helper seguro
    const filePath = `sessions/${code.toLowerCase()}.md`;
    
    let rawContent = '';
    try {
      rawContent = await readContentFile(filePath);
    } catch (error) {
      console.error('Error reading raw file:', error);
    }

    // Devolver la sesión con contenido raw
    return NextResponse.json({
      ...session,
      rawContent
    });

  } catch (error) {
    console.error('Error in GET /api/admin/sessions/[code]/get:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}