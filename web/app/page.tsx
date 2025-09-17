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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }]} />

        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Portal de Catequesis
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Recursos y materiales para la formación catequética
          </p>

          {/* Navegación principal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
            {/* Confirmación */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border border-gray-200 flex flex-col h-full min-h-[320px]">
              <div className="flex flex-col h-full">
                <div className="text-4xl mb-4">✝️</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirmación</h2>
                <p className="text-gray-600 mb-6 flex-grow">
                  Material catequético para jóvenes de 12-13 años
                </p>
                <div className="space-y-3 mt-auto">
                  <a
                    href="#modulos-confirmacion"
                    className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Ver Módulos
                  </a>
                  <div className="text-sm text-gray-500">
                    {config.modules.filter(module => sessionsByModule[module.code]?.length > 0).length} módulos disponibles
                  </div>
                </div>
              </div>
            </div>

            {/* Primera Comunión */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border border-gray-200 flex flex-col h-full min-h-[320px]">
              <div className="flex flex-col h-full">
                <div className="text-4xl mb-4">🍞</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Primera Comunión</h2>
                <p className="text-gray-600 mb-6 flex-grow">
                  Fichas de personajes bíblicos
                </p>
                <div className="space-y-3 mt-auto">
                  <a
                    href="/recursos/catequesis"
                    className="block w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Ver Fichas
                  </a>
                  <div className="text-sm text-gray-500">
                    Material para niños
                  </div>
                </div>
              </div>
            </div>

            {/* Administración */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border border-gray-200 flex flex-col h-full min-h-[320px]">
              <div className="flex flex-col h-full">
                <div className="text-4xl mb-4">⚙️</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Administración</h2>
                <p className="text-gray-600 mb-6 flex-grow">
                  Panel de control para el párroco
                </p>
                <div className="space-y-3 mt-auto">
                  <a
                    href="/login"
                    className="block w-full bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                  >
                    Acceder
                  </a>
                  <div className="text-sm text-gray-500">
                    Gestión de contenido
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Sección de Módulos de Confirmación */}
        <section id="modulos-confirmacion" className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Módulos de Confirmación</h2>
            <p className="text-gray-600">Explora el contenido organizado por temas</p>
          </div>

          {/* Buscador */}
          <div className="mb-8">
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
        </section>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Portal de Catequesis - Inicio',
  description: 'Portal de recursos catequéticos para Confirmación y Primera Comunión. Material para catequistas, jóvenes y niños.',
};

export const metadata = {
  title: 'Portal de Catequesis - Inicio',
  description: 'Portal de recursos catequéticos para Confirmación y Primera Comunión. Material para catequistas, jóvenes y niños.',
};