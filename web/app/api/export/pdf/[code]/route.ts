import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/content-loader';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { logDownload, createLogContext } from '@/lib/logging-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const logContext = createLogContext(request);
  
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const adminPreview = searchParams.get('adminPreview') === '1';
    
    // Validar código (aceptar mayúsculas y minúsculas)
    if (!code || !code.match(/^[A-Fa-f][1-6]$/)) {
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
        if (authCookie) {
          const session = JSON.parse(authCookie.value);
          isAdmin = session.role === 'admin';
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
      printCss = fs.readFileSync(printCssPath, 'utf8');
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

    // Generar PDF con Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });
    
    await browser.close();
    
    // Log descarga exitosa
    logDownload('pdf', code, {
      ...logContext,
      sessionTitle: session.frontMatter.title,
      isAdmin: isAdmin,
      fileSize: pdfBuffer.length
    });
    
    // Generar nombre de archivo
    const slug = session.frontMatter.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const filename = `${code.toLowerCase()}_${slug}.pdf`;

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