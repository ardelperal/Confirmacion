import { notFound } from 'next/navigation';
import { getSession, loadModulesConfig } from '@/lib/content-loader';
import { SessionView } from '@/components/SessionView';
import { DownloadButtons } from '@/components/DownloadButtons';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { readFile, writeFile } from 'fs/promises';
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

interface PreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

const TOKENS_DIR = join(process.cwd(), 'data', 'preview-tokens');

// Validar y marcar token como usado
async function validateAndConsumeToken(token: string, sessionCode: string): Promise<boolean> {
  try {
    const tokenFile = join(TOKENS_DIR, `${token}.json`);
    
    if (!existsSync(tokenFile)) {
      return false;
    }

    const tokenData: PreviewToken = JSON.parse(await readFile(tokenFile, 'utf-8'));
    
    // Verificar que el token corresponde a la sesión
    if (tokenData.sessionCode !== sessionCode.toUpperCase()) {
      return false;
    }

    // Verificar que no ha expirado
    if (new Date() > new Date(tokenData.expiresAt)) {
      return false;
    }

    // Verificar que no ha sido usado
    if (tokenData.used) {
      return false;
    }

    // Marcar como usado
    tokenData.used = true;
    await writeFile(tokenFile, JSON.stringify(tokenData, null, 2));

    // Log de auditoría
    await logTokenConsumption(sessionCode, token);

    return true;
  } catch (error) {
    console.error('Error validando token:', error);
    return false;
  }
}

// Log de auditoría para consumo de token
async function logTokenConsumption(sessionCode: string, token: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    category: 'preview_token',
    action: 'consume',
    sessionCode,
    token: token.substring(0, 8) + '...', // Solo primeros 8 caracteres por seguridad
    message: `Token de preview consumido para sesión ${sessionCode}`
  };
  
  console.log('AUDIT:', JSON.stringify(logEntry));
}

export default async function PreviewPage({ params, searchParams }: any) {
  const { slug } = await params;
  const { token } = await searchParams;
  const sessionCode = slug.toUpperCase();

  // Verificar que se proporciona el token
  if (!token) {
    notFound();
  }

  // Validar y consumir el token
  const isValidToken = await validateAndConsumeToken(token, sessionCode);
  if (!isValidToken) {
    notFound();
  }

  // Cargar la sesión con visibilidad admin (para ver contenido editado)
  const session = await getSession(sessionCode, { visibility: 'admin' });
  
  if (!session) {
    notFound();
  }

  const config = await loadModulesConfig();
  const moduleInfo = config.modules.find(m => m.code === session.frontMatter.module);
  
  const breadcrumbItems = [
    { label: 'Preview', href: '#' },
    { 
      label: `Módulo ${session.frontMatter.module}`, 
      href: '#'
    },
    { 
      label: `Sesión ${sessionCode}`, 
      href: '#'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Banner de preview */}
      <div className="bg-yellow-100 border-b border-yellow-200 print:hidden">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-medium text-yellow-800">
                VISTA PREVIA - Token de un solo uso consumido
              </span>
            </div>
            <div className="text-xs text-yellow-700">
              Sesión: {sessionCode} • Estado: {session.frontMatter.status}
            </div>
          </div>
        </div>
      </div>

      {/* Header con navegación - no se imprime */}
      <div className="print:hidden bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-4">
          <Breadcrumbs items={breadcrumbItems} />
          
          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {session.frontMatter.title}
              </h1>
              <p className="text-gray-600">
                Sesión {sessionCode} • Módulo {session.frontMatter.module}
                {moduleInfo && ` • ${moduleInfo.title}`}
                <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                  {session.frontMatter.status === 'published' ? 'Publicada' : 'Borrador'}
                </span>
              </p>
            </div>
            
            <div className="text-sm text-gray-500">
              Vista previa temporal
            </div>
          </div>
        </div>
      </div>

      {/* Contenido de la sesión - optimizado para impresión A4 */}
      <div className="container mx-auto px-4 py-8 print:px-0 print:py-0">
        <SessionView session={session} />
      </div>
    </div>
  );
}

export async function generateMetadata({ params, searchParams }: any) {
  const { slug } = await params;
  const { token } = await searchParams;
  const sessionCode = slug.toUpperCase();
  
  if (!token) {
    return {
      title: 'Preview no disponible',
    };
  }

  return {
    title: `Preview - Sesión ${sessionCode}`,
    description: `Vista previa temporal de la sesión ${sessionCode}`,
    robots: 'noindex, nofollow', // Evitar indexación de previews
  };
}
