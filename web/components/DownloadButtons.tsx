'use client';

import { useState, useEffect } from 'react';

interface DownloadButtonsProps {
  code: string;
  className?: string;
}

export function DownloadButtons({ 
  code, 
  className = ''
}: DownloadButtonsProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  // Detectar si el usuario es admin
  useEffect(() => {
    const checkAdminStatus = () => {
      try {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(c => c.trim().startsWith('auth-session='));
        if (authCookie) {
          const sessionData = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
          setIsAdmin(sessionData.role === 'admin');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, []);

  const handleDownload = (format: 'pdf' | 'docx' | 'md') => {
    let url;
    
    if (format === 'md') {
      // Para markdown, usar la API existente
      url = `/api/export/markdown/${code.toLowerCase()}`;
    } else {
      // Para PDF y DOCX, agregar adminPreview si es admin
      const baseUrl = `/api/export/${format}/${code.toLowerCase()}`;
      url = isAdmin ? `${baseUrl}?adminPreview=1` : baseUrl;
    }
    
    // Abrir en nueva ventana para descargas
    window.open(url, '_blank');
  };

  return (
    <div className={`flex items-center space-x-2 print:hidden ${className}`}>
      <span className="text-sm text-gray-600 mr-2">Descargar:</span>
      
      {/* Botón PDF */}
      <button
        onClick={() => handleDownload('pdf')}
        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
        title="Descargar como PDF"
      >
        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        PDF
      </button>
      
      {/* Botón DOCX */}
      <button
        onClick={() => handleDownload('docx')}
        className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        title="Descargar como Word"
      >
        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        DOCX
      </button>
      
      {/* Botón Markdown (solo admin) */}
      {isAdmin && (
        <button
          onClick={() => handleDownload('md')}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          title="Descargar Markdown (Admin)"
        >
          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2v8h10V6H5z" clipRule="evenodd" />
          </svg>
          MD
        </button>
      )}
      
      {/* Botón de impresión (solo admin) */}
      {isAdmin && (
        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          title="Imprimir"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Imprimir
      </button>
      )}
    </div>
  );
}

export default DownloadButtons;