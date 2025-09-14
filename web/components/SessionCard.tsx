import Link from 'next/link';
import { SessionSummary } from '@/lib/content-loader';

interface SessionCardProps {
  session: SessionSummary;
}

export function SessionCard({ session }: SessionCardProps) {
  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Link href={`/sesion/${session.code.toLowerCase()}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
        <div className="p-6">
          {/* Header con código y estado */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {session.code}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                {formatDuration(session.duration)}
              </span>
            </div>
            
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Publicado
            </span>
          </div>

          {/* Título */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
            {session.title}
          </h3>

          {/* Referencias bíblicas */}
          {session.bible.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Referencias Bíblicas
              </h4>
              <div className="flex flex-wrap gap-1">
                {session.bible.slice(0, 3).map((ref, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-50 text-purple-700"
                  >
                    {ref}
                  </span>
                ))}
                {session.bible.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                    +{session.bible.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Referencias del Catecismo */}
          {session.cic.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Catecismo
              </h4>
              <div className="flex flex-wrap gap-1">
                {session.cic.slice(0, 3).map((ref, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-amber-50 text-amber-700"
                  >
                    CIC {ref}
                  </span>
                ))}
                {session.cic.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                    +{session.cic.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer con fecha de actualización */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Actualizado: {formatDate(session.updated)}</span>
              <span>v{session.version}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}