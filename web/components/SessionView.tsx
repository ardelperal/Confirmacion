'use client';

import { SessionContent } from '@/types';
import { ClockIcon, UserGroupIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import DownloadButtons from './DownloadButtons';
import Breadcrumbs, { getSessionBreadcrumbs } from './Breadcrumbs';

interface SessionViewProps {
  session: SessionContent;
  moduleTitle?: string;
  showBreadcrumbs?: boolean;
  showDownloadButtons?: boolean;
}

export default function SessionView({ 
  session, 
  moduleTitle = '', 
  showBreadcrumbs = true, 
  showDownloadButtons = true 
}: SessionViewProps) {
  const { frontMatter, content } = session;

  // Procesar el contenido para manejar pagebreaks
  const processContent = (rawContent: string) => {
    return rawContent.split('---pagebreak---').map((section, index) => (
      <div key={index} className={index > 0 ? 'page-break-before print:pt-8' : ''}>
        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: section.trim() }}
        />
      </div>
    ));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <Breadcrumbs 
          items={getSessionBreadcrumbs(
            frontMatter.code, 
            frontMatter.title, 
            frontMatter.module, 
            moduleTitle
          )} 
        />
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg mb-6 print:shadow-none print:border-0">
        <div className="px-6 py-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Sesión {frontMatter.code}: {frontMatter.title}
              </h1>
              <p className="text-gray-600 text-lg">
                {frontMatter.objective}
              </p>
            </div>
            {showDownloadButtons && (
              <div className="print:hidden">
                <DownloadButtons 
                  session={session}
                  title={`Sesión ${frontMatter.code}`}
                />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <div className="flex items-center">
              <ClockIcon className="w-4 h-4 mr-1" />
              {frontMatter.duration} minutos
            </div>
            <div className="flex items-center">
              <UserGroupIcon className="w-4 h-4 mr-1" />
              Módulo {frontMatter.module}
            </div>
            <div className="flex items-center">
              <BookOpenIcon className="w-4 h-4 mr-1" />
              Confirmación (12-13 años)
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6 print:hidden">
        {/* Materiales */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Materiales</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {frontMatter.materials.map((material, index) => (
              <li key={index}>• {material}</li>
            ))}
          </ul>
        </div>

        {/* Referencias Bíblicas */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">Referencias Bíblicas</h3>
          <ul className="text-sm text-green-800 space-y-1">
            {frontMatter.biblical_references.map((ref, index) => (
              <li key={index}>• {ref}</li>
            ))}
          </ul>
        </div>

        {/* Términos Clave */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 mb-2">Términos Clave</h3>
          <div className="text-sm text-purple-800 space-y-1">
            {Object.entries(frontMatter.key_terms).map(([term, definition], index) => (
              <div key={index}>
                <strong>{term}:</strong> {definition}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg print:shadow-none print:border-0">
        <div className="px-6 py-6">
          {processContent(content)}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .page-break-before {
            page-break-before: always;
          }
          
          .print\:hidden {
            display: none !important;
          }
          
          .print\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\:border-0 {
            border: 0 !important;
          }
          
          .print\:pt-8 {
            padding-top: 2rem !important;
          }
          
          body {
            font-size: 12pt;
            line-height: 1.4;
          }
          
          .prose {
            font-size: 11pt;
          }
          
          .prose h1 {
            font-size: 16pt;
            margin-bottom: 0.5rem;
          }
          
          .prose h2 {
            font-size: 14pt;
            margin-bottom: 0.4rem;
          }
          
          .prose h3 {
            font-size: 12pt;
            margin-bottom: 0.3rem;
          }
          
          .prose p {
            margin-bottom: 0.5rem;
          }
          
          .prose ul, .prose ol {
            margin-bottom: 0.5rem;
          }
          
          .prose li {
            margin-bottom: 0.2rem;
          }
        }
      `}</style>
    </div>
  );
}

// Componente simplificado para vista previa
export function SessionPreview({ session }: { session: SessionContent }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">
          {session.frontMatter.code}: {session.frontMatter.title}
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {session.frontMatter.duration} min
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        {session.frontMatter.objective}
      </p>
      <div className="flex flex-wrap gap-2">
        {session.frontMatter.biblical_references.slice(0, 2).map((ref, index) => (
          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {ref}
          </span>
        ))}
        {session.frontMatter.biblical_references.length > 2 && (
          <span className="text-xs text-gray-500">
            +{session.frontMatter.biblical_references.length - 2} más
          </span>
        )}
      </div>
    </div>
  );
}