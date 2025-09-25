import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { getDataRoot, resolveContentPath } from '@/lib/fsSafe';

export async function DELETE(request: NextRequest) {
  try {
    // Verificar rate limiting
    const rateLimitResponse = await checkAdminRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Verificar autenticación
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { code } = await request.json();
    
    // Validar código (permitir códigos estándar A1-F4 y el caso especial 'new')
    if (!code || (!code.match(/^[A-F][1-4]$/) && code !== 'new')) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      );
    }

    const sessionsDir = resolveContentPath('sessions');
    const filePath = resolveContentPath('sessions', `${code}.md`);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Leer el archivo para obtener la versión actual
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data: frontMatter } = matter(fileContent);
    const version = frontMatter.version || 1;

    // Crear directorio de papelera si no existe
    const trashDir = path.join(getDataRoot(), '.trash');
    if (!fs.existsSync(trashDir)) {
      fs.mkdirSync(trashDir, { recursive: true });
    }

    // Generar nombre único para el archivo en papelera
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const trashFileName = `${code}-${timestamp}.md`;
    const trashFilePath = path.join(trashDir, trashFileName);

    // Mover archivo a papelera
    fs.copyFileSync(filePath, trashFilePath);
    fs.unlinkSync(filePath);

    // Registrar en auditoría
    const now = new Date().toISOString();
    await logAudit({
      ts: now,
      user: 'parroco',
      action: 'delete',
      code,
      version,
      trashFile: trashFileName
    });

    return NextResponse.json({ 
      ok: true, 
      message: 'Sesión eliminada exitosamente',
      trashFile: trashFileName
    });
  } catch (error) {
    console.error('Error deleting session:', error);
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
  trashFile?: string;
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
