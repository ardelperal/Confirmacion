import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { getSession } from '../../../../../lib/content-loader';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    
    // Obtener la sesión
    const session = await getSession(code);
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Lanzar navegador
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Configurar la página para impresión
    await page.setViewportSize({ width: 1200, height: 1600 });
    
    // Navegar a la sesión
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
      : 'http://localhost:3000';
    
    await page.goto(`${baseUrl}/session/${code}?print=true`, {
      waitUntil: 'networkidle'
    });

    // Generar PDF con configuración A4 y márgenes de 2cm
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      },
      preferCSSPageSize: true
    });

    await browser.close();

    // Retornar el PDF
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sesion-${code}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error generando PDF:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}