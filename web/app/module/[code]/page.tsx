import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getModule, getAllModules } from '@/lib/content-loader';
import SessionView from '@/components/SessionView';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import DownloadButtons from '@/components/DownloadButtons';

interface ModulePageProps {
  params: Promise<{
    code: string;
  }>;
}

/**
 * Página para mostrar un módulo completo con todas sus sesiones
 */
export default async function ModulePage({ params }: ModulePageProps) {
  const { code } = await params;
  const moduleCode = code.toUpperCase();
  
  // Cargar el módulo completo (solo sesiones publicadas)
  const module = await getModule(moduleCode, { visibility: 'public' });
  
  if (!module) {
    notFound();
  }

  const { info, sessions } = module;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'Portal de Catequesis', href: '/' },
        { label: `Módulo ${info.code}`, href: `/module/${info.code}` }
      ]} />
      
      {/* Botón de retorno */}
      <div className="mb-4 print:hidden">
        <Link 
          href="/#modulos-confirmacion" 
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Módulos de Confirmación
        </Link>
      </div>
      
      {/* Header del módulo */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg mb-6 print:shadow-none print:border-0">
        <div className="px-6 py-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Módulo {info.code}: {info.title}
              </h1>
              <p className="text-gray-600 text-lg mb-4">{info.description}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{sessions.length} sesiones</span>
                <span>•</span>
                <span>Duración total: {sessions.reduce((total, session) => total + session.frontMatter.duration, 0)} minutos</span>
              </div>
            </div>
            <div className="print:hidden">
              <DownloadButtons 
                code={info.code}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vista previa de sesiones */}
      <div className="mb-8 print:hidden">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Sesiones del módulo</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <div key={session.frontMatter.code}>
              <SessionView session={session} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Contenido completo para impresión */}
      <div className="space-y-8 print:block hidden">
        {sessions.map((session, index) => (
          <div key={session.frontMatter.code} className={index > 0 ? 'page-break-before' : ''}>
            <SessionView 
              session={session}
            />
          </div>
        ))}
      </div>

      {/* Navegación entre módulos */}
      <nav className="bg-white border-t print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ModuleNavigation currentCode={moduleCode} />
        </div>
      </nav>
    </div>
  );
}

/**
 * Componente para navegación entre módulos
 */
async function ModuleNavigation({ currentCode }: { currentCode: string }) {
  const allModules = await getAllModules();
  const currentIndex = allModules.indexOf(currentCode);
  
  const prevModule = currentIndex > 0 ? allModules[currentIndex - 1] : null;
  const nextModule = currentIndex < allModules.length - 1 ? allModules[currentIndex + 1] : null;

  return (
    <div className="flex justify-between items-center">
      <div>
        {prevModule && (
          <Link
            href={`/module/${prevModule}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            ← Módulo {prevModule}
          </Link>
        )}
      </div>
      
      <div className="flex space-x-2">
        {allModules.map((moduleCode) => {
          const isActive = moduleCode === currentCode;
          return (
            <Link
              key={moduleCode}
              href={`/module/${moduleCode}`}
              className={`px-3 py-1 rounded text-sm ${
                isActive 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {moduleCode}
            </Link>
          );
        })}
      </div>
      
      <div>
        {nextModule && (
          <Link
            href={`/module/${nextModule}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Módulo {nextModule} →
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Generar rutas estáticas para todos los módulos
 */
export async function generateStaticParams() {
  const modules = await getAllModules();
  
  return modules.map((code) => ({
    code: code.toLowerCase()
  }));
}

/**
 * Metadatos dinámicos para SEO
 */
export async function generateMetadata({ params }: ModulePageProps) {
  const { code } = await params;
  const module = await getModule(code.toUpperCase());
  
  if (!module) {
    return {
      title: 'Módulo no encontrado'
    };
  }

  return {
    title: `Módulo ${module.info.code}: ${module.info.title} | Catequesis Confirmación`,
    description: module.info.description,
  };
}