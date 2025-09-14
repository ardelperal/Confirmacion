import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/content-loader';
import { verifyAdminAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

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

    // Validar formato del código
    if (!code || !/^[A-F][1-6]$/i.test(code)) {
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

    // Obtener el contenido raw del archivo
    const sessionsDir = path.join(process.cwd(), 'content', 'sessions');
    const filePath = path.join(sessionsDir, `${code.toLowerCase()}.md`);
    
    let rawContent = '';
    try {
      rawContent = fs.readFileSync(filePath, 'utf-8');
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