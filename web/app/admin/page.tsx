'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PasswordChangeForm from '@/components/PasswordChangeForm';

interface Session {
  code: string;
  title: string;
  status: 'draft' | 'published';
  version: number;
  editedAt?: string;
  publishedAt?: string;
  editedBy?: string;
}

type StatusFilter = 'all' | 'draft' | 'published';

export default function AdminPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [newSessionCode, setNewSessionCode] = useState('');
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        console.error('Error loading sessions');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handlePublish = async (code: string) => {
    try {
      const response = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (response.ok) {
        loadSessions();
      }
    } catch (error) {
      console.error('Error publishing:', error);
    }
  };

  const handleUnpublish = async (code: string) => {
    try {
      const response = await fetch('/api/admin/unpublish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (response.ok) {
        loadSessions();
      }
    } catch (error) {
      console.error('Error unpublishing:', error);
    }
  };

  const handleDelete = async (code: string) => {
    if (confirm(`¿Estás seguro de que quieres borrar la sesión ${code}?`)) {
      try {
        const response = await fetch('/api/admin/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        if (response.ok) {
          loadSessions();
        }
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handlePublishAll = async () => {
    if (confirm('¿Estás seguro de que quieres publicar TODAS las sesiones con la fecha de hoy?')) {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/publish-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const result = await response.json();
          alert(`${result.message}\n\nSesiones publicadas: ${result.publishedSessions.join(', ')}`);
          loadSessions();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      } catch (error) {
        console.error('Error publishing all:', error);
        alert('Error publicando todas las sesiones');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionCode.match(/^[A-F][1-6]$/)) {
      alert('El código debe seguir el formato A1-F6');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newSessionCode })
      });
      if (response.ok) {
        setShowNewSessionForm(false);
        setNewSessionCode('');
        loadSessions();
        router.push(`/admin/edit/${newSessionCode}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Error creando sesión');
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (statusFilter === 'all') return true;
    return session.status === statusFilter;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Cambiar Contraseña
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Controles */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">Todas las sesiones</option>
                <option value="draft">Borradores</option>
                <option value="published">Publicadas</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handlePublishAll}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {loading ? 'Publicando...' : 'Publicar Todas'}
              </button>
              <button
                onClick={() => setShowNewSessionForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Nueva Sesión
              </button>
            </div>
          </div>

          {/* Formulario nueva sesión */}
          {showNewSessionForm && (
            <div className="mb-6 p-4 bg-white rounded-lg shadow">
              <h3 className="text-lg font-medium mb-3">Crear Nueva Sesión</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Código (ej: A1, B2, F6)"
                  value={newSessionCode}
                  onChange={(e) => setNewSessionCode(e.target.value.toUpperCase())}
                  className="border border-gray-300 rounded-md px-3 py-2"
                  maxLength={2}
                />
                <button
                  onClick={handleCreateSession}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Crear
                </button>
                <button
                  onClick={() => {
                    setShowNewSessionForm(false);
                    setNewSessionCode('');
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tabla de sesiones */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
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
                    Editado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Publicado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.map((session) => (
                  <tr key={session.code}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {session.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.title || 'Sin título'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        session.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.status === 'published' ? 'Publicada' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      v{session.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(session.editedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(session.publishedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/admin/edit/${session.code}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </Link>
                      {session.status === 'draft' ? (
                        <button
                          onClick={() => handlePublish(session.code)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Publicar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnpublish(session.code)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Retirar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(session.code)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredSessions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay sesiones que mostrar
              </div>
            )}
          </div>
          
          {/* Formulario de cambio de contraseña */}
          {showPasswordForm && (
            <div className="mt-6 bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Cambiar Contraseña</h3>
              </div>
              <div className="px-6 py-4">
                <PasswordChangeForm 
                  onSuccess={() => {
                    setShowPasswordForm(false);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}