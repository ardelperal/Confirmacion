import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/content-loader';
import path from 'path';
import { generatePdf, checkGotenbergHealth } from '@/lib/pdf';
import { logDownload, createLogContext } from '@/lib/logging-middleware';
import { assertValidSlug } from '@/lib/slug';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const logContext = createLogContext(request);
  
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const adminPreview = searchParams.get('adminPreview') === '1';
    
    // Validar slug del código
    try {
      assertValidSlug(code.toLowerCase());
    } catch (error) {
      return NextResponse.json(
        { error: 'Código de sesión inválido' },
        { status: 400 }
      );
    }

    // Verificar permisos para preview de admin
    let isAdmin = false;
    if (adminPreview) {
      try {
        const cookieStore = await cookies();
        const authCookie = cookieStore.get('auth-session');
        if (authCookie && authCookie.value && authCookie.value.trim()) {
          try {
            const session = JSON.parse(authCookie.value);
            isAdmin = session && session.role === 'admin';
          } catch (parseError) {
            console.error('Error parsing auth cookie:', parseError);
            isAdmin = false;
            // Cookie corrupta, continuar como no admin
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
      
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'No autorizado para preview de admin' },
          { status: 403 }
        );
      }
    }

    // Cargar sesión
    const session = await getSession(code, { visibility: isAdmin ? 'admin' : 'public' });
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar estado de publicación (solo para público)
    if (!isAdmin && session.frontMatter.status !== 'published') {
      return NextResponse.json(
        { error: 'Sesión no disponible' },
        { status: 404 }
      );
    }

    // Leer CSS de impresión
    const printCssPath = path.join(process.cwd(), 'styles', 'print.css');
    let printCss = '';
    try {
      printCss = await fs.readFile(printCssPath, 'utf8');
    } catch (error) {
      console.warn('No se pudo cargar print.css:', error);
    }

    // Convertir contenido markdown a HTML
    const sessionHtml = convertMarkdownToHtml(session.content, session.frontMatter.title, session.frontMatter.code);

    // Crear HTML completo para PDF
    const fullHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${session.frontMatter.title} - ${session.frontMatter.code}</title>
  <style>
    ${printCss}
    
    /* Estilos adicionales para PDF */
    body {
      font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      margin: 0;
      padding: 20mm;
    }
    
    .pagebreak {
      page-break-after: always;
    }
    
    h1, h2, h3 {
      break-after: avoid;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    
    p {
      orphans: 3;
      widows: 3;
      margin-bottom: 0.8em;
    }
    
    ul, ol {
      margin-bottom: 1em;
    }
    
    li {
      margin-bottom: 0.3em;
    }
  </style>
</head>
<body>
  ${sessionHtml}
</body>
</html>`;

    // Verificar que Gotenberg esté disponible
    const isGotenbergHealthy = await checkGotenbergHealth();
    if (!isGotenbergHealthy) {
      console.error('Gotenberg service is not available');
      return NextResponse.json(
        { error: 'Servicio de generación PDF no disponible' },
        { status: 503 }
      );
    }

    // Generar nombre de archivo
    const slug = session.frontMatter.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const filename = `${code.toLowerCase()}_${slug}.pdf`;

    // Generar PDF con Gotenberg (seguro)
    const pdfBuffer = await generatePdf(fullHtml, {
      filename: filename,
      marginTop: '20mm',
      marginRight: '20mm',
      marginBottom: '20mm',
      marginLeft: '20mm',
      format: 'A4'
    });
    
    // Log descarga exitosa
    logDownload('pdf', code, {
      ...logContext,
      sessionTitle: session.frontMatter.title,
      isAdmin: isAdmin,
      fileSize: pdfBuffer.length
    });

    // Devolver PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función para convertir markdown a HTML
function convertMarkdownToHtml(content: string, title: string, code: string): string {
  // Procesar el contenido markdown básico
  let html = content
    // Encabezados
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Texto en negrita
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Texto en cursiva
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Saltos de página
    .replace(/---pagebreak---/g, '<div class="pagebreak"></div>')
    // Listas con viñetas
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    // Párrafos (líneas que no son encabezados ni listas)
    .replace(/^(?!<[h|l|d])(.*$)/gm, '<p>$1</p>')
    // Limpiar párrafos vacíos
    .replace(/<p>\s*<\/p>/g, '')
    // Saltos de línea
    .replace(/\n/g, '');

  // Envolver listas en ul
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gm, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Agregar título principal
  const titleHtml = `
    <div class="session-header">
      <h1>Curso de Confirmación (12–13)</h1>
      <h2>Sesión ${code.toUpperCase()}: ${title}</h2>
    </div>
  `;

  return titleHtml + html;
}