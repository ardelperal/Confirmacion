import Link from 'next/link';
import { ModuleInfo } from '@/types';
import { SessionSummary } from '@/lib/content-loader';

interface ModuleCardProps {
  module: ModuleInfo;
  sessionCount: number;
  sessions: SessionSummary[];
}

export function ModuleCard({ module, sessionCount, sessions }: ModuleCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        {/* Header del módulo */}
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xl font-bold mr-4">
            {module.code}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Módulo {module.code}
            </h3>
            <p className="text-sm text-gray-600">
              {sessionCount} {sessionCount === 1 ? 'sesión' : 'sesiones'}
            </p>
          </div>
        </div>

        {/* Título del módulo */}
        <h4 className="font-medium text-gray-900 mb-3 line-clamp-2">
          {module.title}
        </h4>

        {/* Descripción */}
        {module.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {module.description}
          </p>
        )}

        {/* Lista de sesiones */}
        <div className="space-y-2 mb-4">
          {sessions.slice(0, 3).map(session => (
            <Link
              key={session.code}
              href={`/sesion/${session.code.toLowerCase()}`}
              className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <div className="flex justify-between items-center">
                <span>
                  <span className="font-medium">{session.code}:</span> {session.title}
                </span>
                <span className="text-xs text-gray-500 ml-2">{session.duration} min</span>
              </div>
            </Link>
          ))}
          
          {sessions.length > 3 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              +{sessions.length - 3} sesiones más
            </div>
          )}
        </div>

        {/* Footer con enlace al módulo */}
        <div className="pt-4 border-t border-gray-100">
          <Link
            href={`/modulo/${module.code.toLowerCase()}`}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Ver módulo completo
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}