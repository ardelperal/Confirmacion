import { notFound } from 'next/navigation';
import { getSession, loadModulesConfig } from '@/lib/content-loader';
import { SessionView } from '@/components/SessionView';
import { DownloadButtons } from '@/components/DownloadButtons';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface SessionPageProps {
  params: { code: string };
}

export default async function SessionPage({ params }: any) {
  const { code } = params;
  const sessionCode = code.toUpperCase();
  
  // Intentar cargar la sesión con scope público
  const session = await getSession(sessionCode, { visibility: 'public' });
  
  if (!session) {
    notFound();
  }

  const config = await loadModulesConfig();
  const moduleInfo = config.modules.find(m => m.code === session.frontMatter.module);
  
  const breadcrumbItems = [
    { label: 'Inicio', href: '/' },
    { 
      label: `Módulo ${session.frontMatter.module}`, 
      href: `/modulo/${session.frontMatter.module.toLowerCase()}` 
    },
    { 
      label: `Sesión ${sessionCode}`, 
      href: `/sesion/${sessionCode.toLowerCase()}` 
    }
  ];

  return (
    <div className="min-h-screen bg-white">
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
              </p>
            </div>
            
            <DownloadButtons code={sessionCode} />
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

export async function generateMetadata({ params }: any) {
  const { code } = await params;
  const sessionCode = code.toUpperCase();
  const session = await getSession(sessionCode, { visibility: 'public' });
  
  if (!session) {
    return {
      title: 'Sesión no encontrada',
    };
  }

  return {
    title: `${session.frontMatter.title} - Sesión ${sessionCode}`,
    description: `Guión completo de la sesión ${sessionCode} del curso de Confirmación. Duración: ${session.frontMatter.duration} minutos.`,
  };
}
