import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
// Removido import de crypto de Node.js para compatibilidad con edge runtime
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface PreviewToken {
  token: string;
  sessionCode: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  createdBy: string;
}

const TOKENS_DIR = join(process.cwd(), 'data', 'preview-tokens');
const TOKEN_TTL_MINUTES = 30;

// Asegurar que el directorio existe
async function ensureTokensDir() {
  if (!existsSync(TOKENS_DIR)) {
    await mkdir(TOKENS_DIR, { recursive: true });
  }
}

// Generar token aleatorio de 32 bytes usando Web Crypto API
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Guardar token en archivo
async function saveToken(tokenData: PreviewToken): Promise<void> {
  await ensureTokensDir();
  const tokenFile = join(TOKENS_DIR, `${tokenData.token}.json`);
  await writeFile(tokenFile, JSON.stringify(tokenData, null, 2));
}

// Log de auditoría
async function logTokenCreation(sessionCode: string, token: string, adminUser: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    category: 'preview_token',
    action: 'create',
    sessionCode,
    token: token.substring(0, 8) + '...', // Solo primeros 8 caracteres por seguridad
    adminUser,
    message: `Token de preview creado para sesión ${sessionCode}`
  };
  
  console.log('AUDIT:', JSON.stringify(logEntry));
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación admin
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere acceso de administrador.' },
        { status: 401 }
      );
    }

    // Obtener datos del request
    const body = await request.json();
    const { sessionCode } = body;

    if (!sessionCode || typeof sessionCode !== 'string') {
      return NextResponse.json(
        { error: 'Código de sesión requerido' },
        { status: 400 }
      );
    }

    // Generar token
    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MINUTES * 60 * 1000);

    const tokenData: PreviewToken = {
      token,
      sessionCode: sessionCode.toUpperCase(),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false,
      createdBy: 'admin' // En el futuro se puede obtener del JWT
    };

    // Guardar token
    await saveToken(tokenData);

    // Log de auditoría
    await logTokenCreation(tokenData.sessionCode, token, 'admin');

    return NextResponse.json({
      ok: true,
      token,
      sessionCode: tokenData.sessionCode,
      expiresAt: tokenData.expiresAt,
      previewUrl: `/preview/${tokenData.sessionCode.toLowerCase()}?token=${token}`
    });

  } catch (error) {
    console.error('Error creando token de preview:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}