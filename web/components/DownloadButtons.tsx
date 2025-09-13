'use client';

import { ArrowDownTrayIcon, PrinterIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { SessionContent } from '@/types';

interface DownloadButtonsProps {
  session?: SessionContent;
  sessions?: SessionContent[];
  title: string;
  className?: string;
}

export default function DownloadButtons({ session, sessions, title, className = '' }: DownloadButtonsProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const sessionCode = session?.frontMatter.code || 'multiple-sessions';
      const response = await fetch(`/api/export/pdf/${sessionCode}`);
      if (!response.ok) throw new Error('Error al generar PDF');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('Error al descargar el PDF. Inténtalo de nuevo.');
    }
  };

  const handleDownloadDOCX = async () => {
    try {
      const sessionCode = session?.frontMatter.code || 'multiple-sessions';
      const response = await fetch(`/api/export/docx/${sessionCode}`);
      if (!response.ok) throw new Error('Error al generar DOCX');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionCode}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando DOCX:', error);
      alert('Error al descargar el DOCX. Inténtalo de nuevo.');
    }
  };

  const handleDownloadMarkdown = () => {
    let content = '';
    
    if (session) {
      // Descargar una sola sesión
      content = generateMarkdownContent(session);
      downloadFile(content, `${session.frontMatter.code}-${session.frontMatter.title}.md`, 'text/markdown');
    } else if (sessions) {
      // Descargar múltiples sesiones
      content = sessions.map(s => generateMarkdownContent(s)).join('\n\n---\n\n');
      downloadFile(content, `${title.replace(/\s+/g, '_')}.md`, 'text/markdown');
    }
  };

  const generateMarkdownContent = (sessionData: SessionContent): string => {
    const { frontMatter, content } = sessionData;
    
    // Generar front-matter YAML
    const yamlFrontMatter = `---
code: "${frontMatter.code}"
title: "${frontMatter.title}"
module: "${frontMatter.module}"
duration: ${frontMatter.duration}
objective: "${frontMatter.objective}"
materials:
${frontMatter.materials.map(m => `  - "${m}"`).join('\n')}
biblical_references:
${frontMatter.biblical_references.map(ref => `  - "${ref}"`).join('\n')}
catechism_references:
${frontMatter.catechism_references.map(ref => `  - "${ref}"`).join('\n')}
key_terms:
${Object.entries(frontMatter.key_terms).map(([key, value]) => `  ${key}: "${value}"`).join('\n')}
created_at: "${frontMatter.created_at}"
---

`;
    
    return yamlFrontMatter + content;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Botón de imprimir */}
      <button
        onClick={handlePrint}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        title="Imprimir"
      >
        <PrinterIcon className="w-4 h-4 mr-2" />
        Imprimir
      </button>

      {/* Botón de descargar Markdown */}
      <button
        onClick={handleDownloadMarkdown}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        title="Descargar Markdown"
      >
        <DocumentTextIcon className="w-4 h-4 mr-2" />
        Markdown
      </button>

      {/* Botón de descargar PDF */}
      <button
        onClick={handleDownloadPDF}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        title="Descargar PDF"
      >
        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
        PDF
      </button>

      {/* Botón de descargar DOCX */}
      <button
        onClick={handleDownloadDOCX}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        title="Descargar DOCX"
      >
        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
        DOCX
      </button>
    </div>
  );
}

export function QuickDownloadButton({ session }: { session: SessionContent }) {
  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/export/pdf/${session.frontMatter.code}`);
      if (!response.ok) throw new Error('Error al generar PDF');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sesion-${session.frontMatter.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('Error al descargar el PDF. Inténtalo de nuevo.');
    }
  };

  const handleDownloadDOCX = async () => {
    try {
      const response = await fetch(`/api/export/docx/${session.frontMatter.code}`);
      if (!response.ok) throw new Error('Error al generar DOCX');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sesion-${session.frontMatter.code}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando DOCX:', error);
      alert('Error al descargar el DOCX. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="flex gap-1">
      <button
        onClick={handleDownloadPDF}
        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
        title="Descargar PDF"
      >
        <ArrowDownTrayIcon className="w-3 h-3 mr-1" />
        PDF
      </button>
      <button
        onClick={handleDownloadDOCX}
        className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 transition-colors"
        title="Descargar DOCX"
      >
        <ArrowDownTrayIcon className="w-3 h-3 mr-1" />
        DOCX
      </button>
    </div>
  );
}