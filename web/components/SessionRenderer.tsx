'use client';

import React from 'react';
import { SessionContent } from '@/types';

interface SessionRendererProps {
  session: SessionContent;
  printMode?: boolean;
  className?: string;
}

/**
 * Componente para renderizar una sesión de catequesis
 * Maneja el contenido HTML con pagebreaks y estilos A4
 */
export default function SessionRenderer({ 
  session, 
  printMode = false, 
  className = '' 
}: SessionRendererProps) {
  const { frontMatter, htmlContent } = session;

  // Procesar el contenido HTML para manejar pagebreaks
  const processedContent = React.useMemo(() => {
    // Dividir el contenido por pagebreaks
    const parts = htmlContent.split('<div class="pagebreak"></div>');
    
    return parts.map((part, index) => {
      // Si no es la primera parte, agregar el pagebreak
      const needsPagebreak = index > 0;
      
      return {
        id: `page-${index}`,
        content: part.trim(),
        needsPagebreak
      };
    }).filter(part => part.content); // Filtrar partes vacías
  }, [htmlContent]);

  const containerClasses = [
    'session-content',
    printMode ? 'print-mode' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* Encabezado de la sesión */}
      <header className="session-header">
        <h1 className="session-title">
          Curso de Confirmación (12–13)
        </h1>
        <h2 className="session-subtitle">
          Sesión {frontMatter.code}: {frontMatter.title}
        </h2>
        
        {/* Metadatos de la sesión */}
        <div className="session-meta">
          <div className="session-meta-item">
            <strong>Módulo:</strong> {frontMatter.module}
          </div>
          <div className="session-meta-item">
            <strong>Duración:</strong> 
            <span className="time-indicator">{frontMatter.duration} min</span>
          </div>
          {frontMatter.objective && (
            <div className="session-meta-item session-objective">
              <strong>Objetivo:</strong> {frontMatter.objective}
            </div>
          )}
        </div>
      </header>

      {/* Contenido principal dividido por páginas */}
      {processedContent.map((page) => (
        <React.Fragment key={page.id}>
          {page.needsPagebreak && (
            <div className="pagebreak" aria-hidden="true">
              {!printMode && (
                <div className="pagebreak-indicator">
                  <span>--- Salto de página ---</span>
                </div>
              )}
            </div>
          )}
          
          <div 
            className="session-page"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </React.Fragment>
      ))}

      {/* Información adicional del front-matter */}
      {(frontMatter.materials || frontMatter.biblical_references || frontMatter.catechism_references) && (
        <footer className="session-footer">
          {frontMatter.materials && frontMatter.materials.length > 0 && (
            <div className="session-materials">
              <h4>Materiales necesarios:</h4>
              <ul>
                {frontMatter.materials.map((material, index) => (
                  <li key={index}>{material}</li>
                ))}
              </ul>
            </div>
          )}
          
          {frontMatter.biblical_references && frontMatter.biblical_references.length > 0 && (
            <div className="session-references">
              <h4>Referencias bíblicas:</h4>
              <ul className="biblical-references-list">
                {frontMatter.biblical_references.map((ref, index) => (
                  <li key={index} className="biblical-reference">{ref}</li>
                ))}
              </ul>
            </div>
          )}
          
          {frontMatter.catechism_references && frontMatter.catechism_references.length > 0 && (
            <div className="session-references">
              <h4>Referencias del Catecismo:</h4>
              <ul className="catechism-references-list">
                {frontMatter.catechism_references.map((ref, index) => (
                  <li key={index} className="catechism-reference">CIC {ref}</li>
                ))}
              </ul>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}

/**
 * Hook para manejar el modo de impresión
 */
export function usePrintMode() {
  const [isPrintMode, setIsPrintMode] = React.useState(false);

  const togglePrintMode = React.useCallback(() => {
    setIsPrintMode(prev => !prev);
  }, []);

  const enablePrintMode = React.useCallback(() => {
    setIsPrintMode(true);
  }, []);

  const disablePrintMode = React.useCallback(() => {
    setIsPrintMode(false);
  }, []);

  // Detectar cuando se abre el diálogo de impresión
  React.useEffect(() => {
    const handleBeforePrint = () => setIsPrintMode(true);
    const handleAfterPrint = () => setIsPrintMode(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  return {
    isPrintMode,
    togglePrintMode,
    enablePrintMode,
    disablePrintMode
  };
}

/**
 * Componente para el botón de impresión
 */
export function PrintButton({ 
  onClick, 
  className = '' 
}: { 
  onClick?: () => void;
  className?: string;
}) {
  const handlePrint = () => {
    if (onClick) {
      onClick();
    }
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className={`print-button ${className}`}
      type="button"
      aria-label="Imprimir sesión"
    >
      🖨️ Imprimir
    </button>
  );
}