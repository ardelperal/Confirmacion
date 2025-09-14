import { Suspense } from 'react';
import { loadModulesConfig, getAllSessions } from '@/lib/content-loader';
import { ModuleCard } from '@/components/ModuleCard';
import { SearchBox } from '@/components/SearchBox';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export default async function HomePage() {
  const [config, sessions] = await Promise.all([
    loadModulesConfig(),
    getAllSessions({ visibility: 'public' })
  ]);

  // Agrupar sesiones por módulo
  const sessionsByModule = sessions.reduce((acc, session) => {
    if (!acc[session.module]) {
      acc[session.module] = [];
    }
    acc[session.module].push(session);
    return acc;
  }, {} as Record<string, typeof sessions>);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }]} />
        
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Curso de Confirmación
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Material catequético para jóvenes de 12-13 años
          </p>
        </header>

        {/* Buscador */}
        <div className="mb-12">
          <SearchBox />
        </div>

        {/* Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {config.modules
            .filter(module => sessionsByModule[module.code]?.length > 0)
            .map(module => (
              <ModuleCard
                key={module.code}
                module={module}
                sessionCount={sessionsByModule[module.code]?.length || 0}
                sessions={sessionsByModule[module.code] || []}
              />
            ))}
        </div>

        {/* Estadísticas */}
        <div className="mt-16 text-center text-gray-500">
          <p>
            {sessions.length} sesiones disponibles en {Object.keys(sessionsByModule).length} módulos
          </p>
          <div className="mt-4">
            <a 
              href="/login" 
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="Acceso administrativo"
            >
              Administración
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Curso de Confirmación - Inicio',
  description: 'Material catequético para jóvenes de 12-13 años. Sesiones organizadas por módulos con contenido bíblico y catequético.',
};