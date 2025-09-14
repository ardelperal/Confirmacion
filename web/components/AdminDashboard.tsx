'use client';

import { useState } from 'react';
import { SessionSummary } from '@/lib/content-loader';
import { 
  Edit, 
  Eye, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Archive,
  LogOut,
  Filter,
  Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import PasswordChangeForm from './PasswordChangeForm';

interface AdminDashboardProps {
  sessions: SessionSummary[];
  auditStats: {
    totalActions: number;
    actionsByType: Record<string, number>;
    lastActivity: string | null;
  };
}

type FilterStatus = 'all' | 'draft' | 'published' | 'archived';

export default function AdminDashboard({ sessions, auditStats }: AdminDashboardProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const router = useRouter();

  // Filtrar sesiones según el estado seleccionado
  const filteredSessions = sessions.filter(session => {
    const status = session.status || 'draft';
    if (filter === 'all') return true;
    return status === filter;
  });

  // Manejar logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  // Manejar acciones de sesión
  const handleAction = async (action: string, code: string) => {
    setLoading(`${action}-${code}`);
    try {
      const response = await fetch(`/api/admin/sessions/${code}/${action}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Recargar la página para mostrar cambios
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Operación fallida'}`);
      }
    } catch (error) {
      console.error(`Error en ${action}:`, error);
      alert('Error de conexión');
    } finally {
      setLoading(null);
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtener badge de estado
  const getStatusBadge = (status: string | undefined) => {
    const statusValue = status || 'draft';
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      draft: 'Borrador',
      published: 'Publicado',
      archived: 'Archivado'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        badges[statusValue as keyof typeof badges] || badges.draft
      }`}>
        {labels[statusValue as keyof typeof labels] || 'Borrador'}
      </span>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header con filtros y logout */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterStatus)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las sesiones</option>
              <option value="draft">Borradores</option>
              <option value="published">Publicadas</option>
              <option value="archived">Archivadas</option>
            </select>
            <span className="text-sm text-gray-500">
              {filteredSessions.length} de {sessions.length} sesiones
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Settings className="h-4 w-4 mr-2" />
              Cambiar Contraseña
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de sesiones */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Versión
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Última Edición
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Publicado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSessions.map((session) => {
              const status = session.status || 'draft';
              const isPublished = status === 'published';
              
              return (
                <tr key={session.code} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {session.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {session.title || 'Sin título'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    v{session.version || 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(session.updated)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(session.publishedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Ver */}
                      <button
                        onClick={() => router.push(`/sesion/${session.code}`)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver sesión"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {/* Editar */}
                      <button
                        onClick={() => router.push(`/admin/edit/${session.code}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      {/* Publicar/Despublicar */}
                      {isPublished ? (
                        <button
                          onClick={() => handleAction('unpublish', session.code)}
                          disabled={loading === `unpublish-${session.code}`}
                          className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                          title="Retirar publicación"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction('publish', session.code)}
                          disabled={loading === `publish-${session.code}`}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          title="Publicar"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Archivar */}
                      {status !== 'archived' && (
                        <button
                          onClick={() => handleAction('archive', session.code)}
                          disabled={loading === `archive-${session.code}`}
                          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          title="Archivar"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Eliminar */}
                      <button
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar la sesión ${session.code}?`)) {
                            handleAction('delete', session.code);
                          }
                        }}
                        disabled={loading === `delete-${session.code}`}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay sesiones que coincidan con el filtro seleccionado.</p>
        </div>
      )}
      
      {/* Formulario de cambio de contraseña */}
      {showPasswordForm && (
        <div className="px-6 py-4 border-t border-gray-200">
          <PasswordChangeForm 
            onSuccess={() => {
              setShowPasswordForm(false);
            }}
          />
        </div>
      )}
    </div>
  );
}