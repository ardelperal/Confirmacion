import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/content-loader';
import { generatePdf, checkPlaywrightHealth } from '@/lib/pdf';
import { logDownload, createLogContext } from '@/lib/logging-middleware';
import { assertValidSlug } from '@/lib/slug';
import { verifyAdminAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Configuración para evitar pre-renderizado durante el build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = false;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  // Verificación de entorno de build - evitar ejecución durante build
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json(
      { error: 'Service temporarily unavailable during build' },
      { status: 503 }
    );
  }

  // Verificación adicional para request válido
  if (!request || !request.nextUrl) {
    return NextResponse.json(
      { error: 'Invalid request context' },
      { status: 400 }
    );
  }

  try {
    const params = await context.params;
    const { code } = params;
    
    // Manejo seguro de searchParams
    let adminPreview = false;
    if (request.nextUrl) {
      adminPreview = request.nextUrl.searchParams.get('adminPreview') === '1';
    }
    
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
    if (adminPreview) {
      try {
        const cookieStore = await cookies();
        const authCookie = cookieStore.get('auth-session');
        if (authCookie && authCookie.value && authCookie.value.trim()) {
          try {
            const authResult = await verifyAdminAuth(request);
            if (!authResult.success) {
              return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
              );
            }
          } catch (authError) {
            console.error('Error verificando autenticación:', authError);
            return NextResponse.json(
              { error: 'Error de autenticación' },
              { status: 401 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'No autorizado' },
            { status: 401 }
          );
        }
      } catch (cookieError) {
        console.error('Error accediendo a cookies:', cookieError);
        return NextResponse.json(
          { error: 'Error de autenticación' },
          { status: 401 }
        );
      }
    }

    // Cargar sesión
    const session = await getSession(code.toLowerCase());
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si la sesión está publicada (solo para usuarios no admin)
    if (!adminPreview && session.frontMatter.status !== 'published') {
      return NextResponse.json(
        { error: 'Sesión no disponible' },
        { status: 404 }
      );
    }

    // Verificar estado de Playwright
    const playwrightHealth = await checkPlaywrightHealth();
    if (!playwrightHealth) {
      console.error('Playwright no está disponible');
      return NextResponse.json(
        { error: 'Servicio de PDF temporalmente no disponible' },
        { status: 503 }
      );
    }

    // Leer CSS de impresión
    const printCssPath = path.join(process.cwd(), 'styles', 'print.css');
    let printCss = '';
    try {
      printCss = fs.readFileSync(printCssPath, 'utf-8');
    } catch (error) {
      console.warn('No se pudo cargar print.css:', error);
    }

    // Convertir contenido markdown a HTML
    const htmlContent = convertMarkdownToHtml(session.content);

    // Construir HTML completo
    const fullHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${session.frontMatter.title}</title>
    <style>
        ${printCss}
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        h1, h2, h3 { color: #333; }
        .session-header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .session-meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
        .page-break { page-break-before: always; }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="session-header">
        <h1>${session.frontMatter.title}</h1>
        <div class="session-meta">
            <p><strong>Código:</strong> ${code.toUpperCase()}</p>
            <p><strong>Módulo:</strong> ${session.frontMatter.module}</p>
            ${session.frontMatter.duration ? `<p><strong>Duración:</strong> ${session.frontMatter.duration} min</p>` : ''}
        </div>
    </div>
    <div class="session-content">
        ${htmlContent}
    </div>
</body>
</html>`;

    // Generar PDF
    const pdfBuffer = await generatePdf(fullHtml);

    // Log de descarga
    const logContext = createLogContext(request);
    logDownload('pdf', code, logContext);

    // Retornar PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sesion-${code.toLowerCase()}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error) {
    console.error('Error generando PDF:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función auxiliar para convertir Markdown a HTML
function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown
    // Encabezados
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Texto en negrita y cursiva
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Saltos de página
    .replace(/---pagebreak---/g, '<div class="page-break"></div>')
    
    // Listas
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    
    // Párrafos
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|l|d])/gm, '<p>')
    .replace(/(?<![>])$/gm, '</p>');

  // Envolver listas en etiquetas ul
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  
  return html;
}
