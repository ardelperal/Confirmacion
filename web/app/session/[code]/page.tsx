import { notFound } from 'next/navigation';
import { getSession, getAllSessions, getModule } from '@/lib/content-loader';
import SessionView from '@/components/SessionView';

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