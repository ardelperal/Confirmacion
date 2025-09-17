import Link from 'next/link';
import { SessionSummary } from '@/lib/content-loader';

interface SessionCardProps {
  session: SessionSummary;
}

export default function SessionCard({ session }: SessionCardProps) {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Link href={`/sesion/${session.code.toLowerCase()}`} className="block">
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-4 sm:p-6 h-full border border-gray-200">
        {/* Header con código, duración y estado */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
              {session.code}
            </span>
            <span className="text-gray-500 text-sm">
              {formatDuration(session.duration)}
            </span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium self-start ${
            session.status === 'published' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {session.status === 'published' ? 'Publicada' : 'Borrador'}
          </span>
        </div>

        {/* Título */}
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
          {session.title}
        </h3>

        {/* Referencias bíblicas */}
        {session.bible && session.bible.length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-1">Referencias bíblicas:</p>
            <div className="flex flex-wrap gap-1">
              {session.bible.slice(0, 2).map((ref, index) => (
                <span key={index} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                  {ref}
                </span>
              ))}
              {session.bible.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{session.bible.length - 2} más
                </span>
              )}
            </div>
          </div>
        )}

        {/* Referencias del Catecismo */}
        {session.cic && session.cic.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Catecismo:</p>
            <div className="flex flex-wrap gap-1">
              {session.cic.slice(0, 2).map((ref, index) => (
                <span key={index} className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                  {ref}
                </span>
              ))}
              {session.cic.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{session.cic.length - 2} más
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer con fecha */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm text-gray-500 mt-auto pt-4 border-t border-gray-100 space-y-1 sm:space-y-0">
          <span>Actualizada: {formatDate(session.updated)}</span>
          <span>v{session.version}</span>
        </div>
      </div>
    </Link>
  );
}