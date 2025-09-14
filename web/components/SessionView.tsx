import { SessionContent } from '@/types';

interface SessionViewProps {
  session: SessionContent;
  className?: string;
}

export function SessionView({ session, className = '' }: SessionViewProps) {
  return (
    <article className={`session-view ${className}`}>
      {/* Encabezado de la sesión */}
      <header className="mb-8 print:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {session.frontMatter.code}
            </span>
            <span className="text-sm text-gray-500">
              Módulo {session.frontMatter.module}
            </span>
            <span className="text-sm text-gray-500">
              {session.frontMatter.duration} min
            </span>
          </div>
          <div className="text-sm text-gray-500 print:hidden">
            {session.frontMatter.status === 'published' ? (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                Publicado
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                Borrador
              </span>
            )}
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4 print:text-2xl">
          {session.frontMatter.title}
        </h1>
        
        {/* Metadatos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 print:grid-cols-2 print:gap-2">
          {session.frontMatter.biblical_references && session.frontMatter.biblical_references.length > 0 && (
            <div>
              <span className="font-medium text-gray-900">Referencias bíblicas:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {session.frontMatter.biblical_references.map((ref, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 print:bg-transparent print:border print:border-purple-300">
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {session.frontMatter.catechism_references && session.frontMatter.catechism_references.length > 0 && (
            <div>
              <span className="font-medium text-gray-900">Catecismo:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {session.frontMatter.catechism_references.map((ref, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 print:bg-transparent print:border print:border-amber-300">
                    CIC {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Fechas */}
        <div className="mt-4 flex space-x-6 text-xs text-gray-500 print:hidden">
          {session.frontMatter.editedAt && (
            <div>
              <span className="font-medium">Editado:</span> {new Date(session.frontMatter.editedAt).toLocaleDateString('es-ES')}
            </div>
          )}
          {session.frontMatter.publishedAt && (
            <div>
              <span className="font-medium">Publicado:</span> {new Date(session.frontMatter.publishedAt).toLocaleDateString('es-ES')}
            </div>
          )}
        </div>
      </header>
      
      {/* Contenido principal */}
      <div 
        className="prose prose-lg max-w-none print:prose-sm
                   prose-headings:text-gray-900 prose-headings:font-semibold
                   prose-p:text-gray-700 prose-p:leading-relaxed
                   prose-strong:text-gray-900 prose-strong:font-semibold
                   prose-em:text-gray-700 prose-em:italic
                   prose-ul:text-gray-700 prose-ol:text-gray-700
                   prose-li:text-gray-700 prose-li:leading-relaxed
                   prose-blockquote:text-gray-600 prose-blockquote:border-blue-200
                   prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded
                   prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200
                   prose-hr:border-gray-300
                   print:prose-headings:text-black
                   print:prose-p:text-black
                   print:prose-strong:text-black
                   print:prose-em:text-black
                   print:prose-ul:text-black
                   print:prose-ol:text-black
                   print:prose-li:text-black
                   print:prose-blockquote:text-black
                   print:prose-code:bg-transparent print:prose-code:border
                   print:prose-pre:bg-transparent"
        dangerouslySetInnerHTML={{ __html: session.htmlContent || '' }}
      />
      
      {/* Footer para impresión */}
      <footer className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            Curso de Confirmación • Sesión {session.frontMatter.code}: {session.frontMatter.title}
          </div>
          <div>
            Página {/* Se puede añadir numeración de página con CSS */}
          </div>
        </div>
      </footer>
    </article>
  );
}

export default SessionView;

/* Estilos CSS adicionales para impresión - añadir al global.css */
/*
@media print {
  .pagebreak {
    page-break-before: always;
    break-before: page;
  }
  
  .session-view {
    font-size: 11pt;
    line-height: 1.4;
  }
  
  .session-view h1 {
    font-size: 18pt;
    margin-bottom: 12pt;
  }
  
  .session-view h2 {
    font-size: 14pt;
    margin-top: 16pt;
    margin-bottom: 8pt;
  }
  
  .session-view h3 {
    font-size: 12pt;
    margin-top: 12pt;
    margin-bottom: 6pt;
  }
  
  .session-view p {
    margin-bottom: 8pt;
  }
  
  .session-view ul, .session-view ol {
    margin-bottom: 8pt;
  }
  
  .session-view li {
    margin-bottom: 4pt;
  }
}
*/