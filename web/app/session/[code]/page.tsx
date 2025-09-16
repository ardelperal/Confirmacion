import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession, getAllSessions, getModule } from '@/lib/content-loader';
import SessionView from '@/components/SessionView';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface SessionPageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { code } = await params;
  const session = await getSession(code, { visibility: 'public' });
  
  if (!session) {
    notFound();
  }

  // Obtener información del módulo para el breadcrumb
  const moduleData = await getModule(session.frontMatter.module);
  const moduleTitle = moduleData?.info.title || `Módulo ${session.frontMatter.module}`;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'Portal de Catequesis', href: '/' },
        { label: `Módulo ${session.frontMatter.module}`, href: `/module/${session.frontMatter.module}` },
        { label: session.frontMatter.title, href: `/session/${session.frontMatter.code}` }
      ]} />
      
      {/* Botón de retorno */}
      <div className="mb-4 print:hidden">
        <Link 
          href={`/module/${session.frontMatter.module}`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al {moduleTitle}
        </Link>
      </div>
      
      <SessionView
        session={session}
      />
    </div>
  );
}



/**
 * Generar rutas estáticas para todas las sesiones
 */
export async function generateStaticParams() {
  const sessions = await getAllSessions({ visibility: 'public' });
  
  return sessions.map((session) => ({
    code: session.code
  }));
}

/**
 * Metadatos dinámicos para SEO
 */
export async function generateMetadata({ params }: SessionPageProps) {
  const { code } = await params;
  const session = await getSession(code, { visibility: 'public' });
  
  if (!session) {
    return {
      title: 'Sesión no encontrada'
    };
  }

  return {
    title: `${session.frontMatter.code}: ${session.frontMatter.title} | Catequesis Confirmación`,
    description: session.frontMatter.objective || `Sesión ${session.frontMatter.code} del curso de Confirmación`,
  };
}