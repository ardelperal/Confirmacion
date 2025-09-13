import Link from 'next/link';
import { loadModulesConfig, getContentStats, getAllSessions } from '@/lib/content-loader';
import SearchBox from '@/components/SearchBox';
import { SessionPreview } from '@/components/SessionView';

export default async function Home() {
  const [config, stats, allSessions] = await Promise.all([
    loadModulesConfig(),
    getContentStats(),
    getAllSessions()
  ]);
  
  const modules = config.modules;
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Sistema de Catequesis - {stats.courseName}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Guiones completos para catequistas ({stats.targetAge} años)
          </p>
          <div className="flex justify-center gap-6 text-sm text-gray-500">
            <span>{stats.totalModules} módulos</span>
            <span>•</span>
            <span>{stats.totalSessions} sesiones</span>
          </div>
          
          {/* Buscador */}
          <div className="mt-8 max-w-lg mx-auto">
            <SearchBox 
              sessions={allSessions}
              placeholder="Buscar sesiones por tema, código o contenido..."
              maxResults={8}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <div key={module.code} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xl font-bold mr-4">
                  {module.code}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Módulo {module.code}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {module.sessions.length} sesiones
                  </p>
                </div>
              </div>
              
              <h3 className="font-medium text-gray-900 mb-3">
                {module.title}
              </h3>
              
              <div className="space-y-2">
                {module.sessions.map((session) => (
                  <Link
                    key={session.code}
                    href={`/session/${session.code}`}
                    className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    Sesión {session.code}: {session.title}
                  </Link>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Link
                  href={`/module/${module.code}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Ver módulo completo →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Información del Curso
            </h3>
            <p className="text-gray-600 mb-4">
              Este curso está diseñado siguiendo las directrices del Catecismo de la Iglesia Católica
              y adaptado para jóvenes que se preparan para recibir el Sacramento de la Confirmación.
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500">
              <span>📖 24 sesiones</span>
              <span>⏱️ 60 minutos por sesión</span>
              <span>👥 Grupos de 8-12 jóvenes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}