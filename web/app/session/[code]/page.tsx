import { notFound } from 'next/navigation';
import { getSession, getAllSessions, getModule } from '@/lib/content-loader';
import SessionView from '@/components/SessionView';

interface SessionPageProps {
  params: {
    code: string;
  };
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { code } = params;
  const session = await getSession(code);
  
  if (!session) {
    notFound();
  }

  // Obtener información del módulo para el breadcrumb
  const moduleData = await getModule(session.frontMatter.module);
  const moduleTitle = moduleData?.title || `Módulo ${session.frontMatter.module}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <SessionView 
        session={session}
        moduleTitle={moduleTitle}
        showBreadcrumbs={true}
        showDownloadButtons={true}
      />
    </div>
  );
}



/**
 * Generar rutas estáticas para todas las sesiones
 */
export async function generateStaticParams() {
  const sessions = await getAllSessions();
  
  return sessions.map((code) => ({
    code: code
  }));
}

/**
 * Metadatos dinámicos para SEO
 */
export async function generateMetadata({ params }: SessionPageProps) {
  const { code } = params;
  const session = await getSession(code);
  
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