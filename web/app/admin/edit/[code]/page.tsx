'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { parseMarkdown } from '@/lib/markdown-parser';

// Importar EasyMDE dinámicamente para evitar problemas de SSR
const SimpleMDE = dynamic(() => import('react-simplemde-editor'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded"></div>
});

interface SessionData {
  code: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  version: number;
  editedAt?: string;
  publishedAt?: string;
}

export default function SessionEditor() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [duplicateCode, setDuplicateCode] = useState('');
  const [showDuplicateForm, setShowDuplicateForm] = useState(false);
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  useEffect(() => {
    if (code) {
      loadSession();
    }
  }, [code]);

  const loadSession = async () => {
    try {
      const response = await fetch(`/api/admin/session/${code}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setContent(data.session.content);
      } else if (response.status === 404) {
        // Sesión no existe, crear con plantilla
        await createNewSession();
      } else {
        console.error('Error loading session');
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error:', error);
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (response.ok) {
        // Recargar la sesión recién creada
        await loadSession();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const processMarkdownToHtml = async (markdownContent: string) => {
    try {
      const parsed = await parseMarkdown(markdownContent);
      setHtmlContent(parsed.htmlContent);
    } catch (error) {
      console.error('Error processing markdown:', error);
      setHtmlContent('<p>Error procesando el contenido markdown</p>');
    }
  };

  const handleSave = async () => {
    if (!session) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: session.code, markdown: content })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSession(prev => prev ? { ...prev, version: result.version } : null);
        alert('Sesión guardada exitosamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error guardando sesión');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error guardando sesión');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: session.code })
      });
      
      if (response.ok) {
        setSession(prev => prev ? { ...prev, status: 'published' } : null);
        alert('Sesión publicada exitosamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error publicando sesión');
      }
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Error publicando sesión');
    }
  };

  const handleUnpublish = async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/admin/unpublish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: session.code })
      });
      
      if (response.ok) {
        setSession(prev => prev ? { ...prev, status: 'draft' } : null);
        alert('Sesión retirada exitosamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error retirando sesión');
      }
    } catch (error) {
      console.error('Error unpublishing:', error);
      alert('Error retirando sesión');
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    
    if (!confirm(`¿Estás seguro de eliminar la sesión ${session.code}?`)) return;
    
    try {
      const response = await fetch('/api/admin/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: session.code })
      });
      
      if (response.ok) {
        alert('Sesión eliminada exitosamente');
        router.push('/admin');
      } else {
        const error = await response.json();
        alert(error.error || 'Error eliminando sesión');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error eliminando sesión');
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateCode.match(/^[A-F][1-4]$/)) {
      alert('El código debe seguir el formato A1-F4');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sourceCode: session?.code, 
          targetCode: duplicateCode,
          content 
        })
      });
      
      if (response.ok) {
        setShowDuplicateForm(false);
        setDuplicateCode('');
        alert('Sesión duplicada exitosamente');
        router.push(`/admin/edit/${duplicateCode}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Error duplicando sesión');
      }
    } catch (error) {
      console.error('Error duplicating:', error);
      alert('Error duplicando sesión');
    }
  };

  const downloadMarkdown = () => {
    if (!session) return;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.code}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Cargando editor...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">Error cargando sesión</div>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin" 
                className="text-blue-600 hover:text-blue-800"
              >
                ← Volver al panel
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Editor - Sesión {session.code}
              </h1>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                session.status === 'published' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {session.status === 'published' ? 'Publicada' : 'Borrador'} v{session.version}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={async () => {
                  if (!showPreview) {
                    // Procesar markdown a HTML antes de mostrar la vista previa
                    await processMarkdownToHtml(content);
                  }
                  setShowPreview(!showPreview);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                {showPreview ? 'Editor' : 'Vista Previa'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Botones de acción */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          
          {session.status === 'draft' ? (
            <button
              onClick={handlePublish}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Publicar
            </button>
          ) : (
            <button
              onClick={handleUnpublish}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Retirar
            </button>
          )}
          
          <button
            onClick={downloadMarkdown}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Descargar MD
          </button>
          
          <button
            onClick={() => setShowDuplicateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Duplicar
          </button>
          
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Eliminar
          </button>
        </div>

        {/* Formulario duplicar */}
        {showDuplicateForm && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium mb-3">Duplicar Sesión</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Nuevo código (ej: A1, B2, F6)"
                value={duplicateCode}
                onChange={(e) => setDuplicateCode(e.target.value.toUpperCase())}
                className="border border-gray-300 rounded-md px-3 py-2"
                maxLength={2}
              />
              <button
                onClick={handleDuplicate}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Duplicar
              </button>
              <button
                onClick={() => {
                  setShowDuplicateForm(false);
                  setDuplicateCode('');
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Editor / Vista previa */}
        <div className="bg-white rounded-lg shadow">
          {showPreview ? (
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Vista Previa</h3>
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
                           prose-hr:border-gray-300"
                dangerouslySetInnerHTML={{ 
                  __html: htmlContent.replace(/---pagebreak---/g, '<div class="border-t-2 border-dashed border-gray-300 my-8 pt-8"><small class="text-gray-500">--- Salto de página ---</small></div>').replace(/<div class="pagebreak"><\/div>/g, '<div class="border-t-2 border-dashed border-gray-300 my-8 pt-8"><small class="text-gray-500">--- Salto de página ---</small></div>')
                }}
              />
            </div>
          ) : (
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Editor Markdown</h3>
              <SimpleMDE
                value={content}
                onChange={setContent}
                options={{
                  spellChecker: false,
                  placeholder: 'Escribe el contenido de la sesión en Markdown...',
                  toolbar: [
                    'bold', 'italic', 'heading', '|',
                    'quote', 'unordered-list', 'ordered-list', '|',
                    'link', 'table', '|',
                    'preview', 'side-by-side', 'fullscreen', '|',
                    'guide'
                  ],
                  status: ['lines', 'words', 'cursor']
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}