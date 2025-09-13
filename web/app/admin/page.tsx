import { redirect } from 'next/navigation';
import { isAdmin, isReadOnly } from '@/lib/auth';
import { getAllSessions } from '@/lib/content-loader';
import { getAuditStats } from '@/lib/audit';
import AdminDashboard from '@/components/AdminDashboard';

export default async function AdminPage() {
  // Verificar autenticación
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    redirect('/login');
  }

  // Verificar si está en modo solo lectura
  if (isReadOnly()) {
    redirect('/');
  }

  // Cargar datos
  const sessions = await getAllSessions(true); // Incluir todas las sesiones
  const auditStats = await getAuditStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Panel de Administración
            </h1>
            <p className="mt-2 text-gray-600">
              Sistema de Catequesis - Gestión de Contenido
            </p>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {sessions.length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Sesiones
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {sessions.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {sessions.filter(s => s.frontMatter?.status === 'published').length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Publicadas
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {sessions.filter(s => s.frontMatter?.status === 'published').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {sessions.filter(s => s.frontMatter?.status === 'draft' || !s.frontMatter?.status).length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Borradores
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {sessions.filter(s => s.frontMatter?.status === 'draft' || !s.frontMatter?.status).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {auditStats.totalActions}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Acciones
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {auditStats.totalActions}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard principal */}
          <AdminDashboard sessions={sessions} auditStats={auditStats} />
        </div>
      </div>
    </div>
  );
}