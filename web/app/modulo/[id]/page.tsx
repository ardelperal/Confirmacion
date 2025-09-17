import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadModulesConfig, getAllSessions } from '@/lib/content-loader';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import SessionCard from '@/components/SessionCard';

interface ModulePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { id } = await params;
  const moduleCode = id.toUpperCase();
  
  const [config, sessions] = await Promise.all([
    loadModulesConfig(),
    getAllSessions({ visibility: 'public' })
  ]);

  const module = config.modules.find(m => m.code === moduleCode);
  if (!module) {
    notFound();
  }

  // Filtrar sesiones del módulo
  const moduleSessions = sessions
    .filter(session => session.module === moduleCode)
    .sort((a, b) => a.code.localeCompare(b.code));

  const breadcrumbItems = [
    { label: 'Inicio', href: '/' },
    { label: `Módulo ${moduleCode}`, href: `/modulo/${moduleCode.toLowerCase()}` }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        <header className="mb-12">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold mr-6">
              {moduleCode}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Módulo {moduleCode}
              </h1>
              <p className="text-lg text-gray-600">
                {moduleSessions.length} sesiones disponibles
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {module.title}
            </h2>
            {module.description && (
              <p className="text-gray-600 leading-relaxed">
                {module.description}
              </p>
            )}
          </div>
        </header>

        {/* Lista de sesiones */}
        {moduleSessions.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {moduleSessions.map(session => (
              <SessionCard
                key={session.code}
                session={session}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay sesiones disponibles
            </h3>
            <p className="text-gray-500 mb-6">
              Las sesiones de este módulo aún no han sido publicadas.
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Volver al inicio
            </Link>
          </div>
        )}

        {/* Navegación entre módulos */}
        <div className="mt-16 flex justify-between items-center">
          <div>
            {module.order > 1 && (
              <Link
                href={`/modulo/${config.modules.find(m => m.order === module.order - 1)?.code.toLowerCase()}`}
                className="inline-flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                ← Módulo anterior
              </Link>
            )}
          </div>
          <div>
            {module.order < config.modules.length && (
              <Link
                href={`/modulo/${config.modules.find(m => m.order === module.order + 1)?.code.toLowerCase()}`}
                className="inline-flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Módulo siguiente →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const config = await loadModulesConfig();
  return config.modules.map(module => ({
    id: module.code.toLowerCase()
  }));
}

export async function generateMetadata({ params }: ModulePageProps) {
  const { id } = await params;
  const moduleCode = id.toUpperCase();
  const config = await loadModulesConfig();
  const module = config.modules.find(m => m.code === moduleCode);
  
  if (!module) {
    return {
      title: 'Módulo no encontrado',
    };
  }

  return {
    title: `Módulo ${moduleCode}: ${module.title} - Curso de Confirmación`,
    description: module.description || `Sesiones del módulo ${moduleCode} del curso de Confirmación para jóvenes de 12-13 años.`,
  };
}