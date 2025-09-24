import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/content-loader';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
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
        if (authCookie && authCookie.value && authCookie.value.trim()) {
          try {
            const session = JSON.parse(authCookie.value);
            isAdmin = session.role === 'admin';
          } catch (parseError) {
            console.warn('Error parsing auth cookie:', parseError);
            isAdmin = false;
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

    // Crear documento DOCX
    const doc = new Document({
      creator: "Sistema de Confirmación",
      title: session.frontMatter.title,
      description: `Sesión ${session.frontMatter.code}: ${session.frontMatter.title}`,
      compatibility: {
        version: 15 // Evitar modo de compatibilidad en Word
      },
      numbering: {
        config: [
          {
            reference: 'default',
            levels: [
              {
                level: 0,
                format: 'decimal',
                text: '%1.',
                alignment: 'start',
                style: {
                  paragraph: {
                    indent: { left: 720, hanging: 260 }
                  }
                }
              }
            ]
          }
        ]
      },
      sections: [{
        properties: {
          page: {
            size: {
              orientation: 'portrait',
              width: '210mm',
              height: '297mm'
            },
            margin: {
              top: '25mm',
              right: '20mm',
              bottom: '25mm',
              left: '20mm'
            }
          }
        },
        children: convertContentToDocx(session.content, session.frontMatter.title, session.frontMatter.code)
      }]
    });

    // Generar buffer del documento
    const buffer = await Packer.toBuffer(doc);
    
    // Verificar que el buffer no esté vacío
    if (!buffer || buffer.length === 0) {
      throw new Error('El documento generado está vacío');
    }
    
    // Generar nombre de archivo
    const slug = session.frontMatter.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const filename = `${code.toLowerCase()}_${slug}.docx`;

    // Configurar respuesta con encabezados específicos para Word
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff'
      }
    });

    return response;

  } catch (error) {
    console.error('Error generating DOCX:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function convertContentToDocx(content: string, title: string, code: string): any[] {
  const elements: Paragraph[] = [];
  
  // No generar cabeceras duplicadas - el contenido Markdown ya las incluye

  // Procesar contenido línea por línea
  const lines = content.split('\n');
  let currentList: Array<{ text: string; level: number }> = [];
  let listType: 'bullet' | 'number' | null = null;
  let listLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Salto de página (marcador original o etiqueta HTML)
    if (trimmedLine === '---pagebreak---' || trimmedLine === '<div class="pagebreak"></div>') {
      flushCurrentList();
      // SOLUCIÓN: Usar Paragraph con pageBreakBefore en lugar de PageBreak directo
      elements.push(new Paragraph({
        children: [new TextRun({ text: '', break: 1 })],
        pageBreakBefore: true
      }));
      continue;
    }
    
    // Líneas vacías
    if (!trimmedLine) {
      flushCurrentList();
      elements.push(new Paragraph({ text: '' }));
      continue;
    }
    
    // Encabezados markdown (# ## ### ####)
    const headerMatch = trimmedLine.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      flushCurrentList();
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      let headingLevel;
      let fontSize = 24; // Tamaño por defecto
      let color = "000000"; // Negro por defecto
      
      switch (level) {
        case 1: 
          headingLevel = HeadingLevel.HEADING_1; 
          fontSize = 32;
          color = "2E86AB"; // Azul
          break;
        case 2: 
          headingLevel = HeadingLevel.HEADING_2; 
          fontSize = 28;
          color = "A23B72"; // Morado
          break;
        case 3: 
          headingLevel = HeadingLevel.HEADING_3; 
          fontSize = 24;
          color = "F18F01"; // Naranja
          break;
        case 4: 
          headingLevel = HeadingLevel.HEADING_4; 
          fontSize = 20;
          color = "C73E1D"; // Rojo
          break;
        default: 
          headingLevel = HeadingLevel.HEADING_4;
          fontSize = 20;
      }
      
      elements.push(
        new Paragraph({
          children: [new TextRun({ 
            text: headerText, 
            bold: true,
            size: fontSize,
            color: color
          })],
          heading: headingLevel,
          spacing: {
            before: 240, // Espacio antes del encabezado
            after: 120   // Espacio después del encabezado
          }
        })
      );
      continue;
    }
    
    // Encabezados nivel 1 (===)
    if (trimmedLine.startsWith('=== ') && trimmedLine.endsWith(' ===')) {
      flushCurrentList();
      const headerText = trimmedLine.replace(/^=== | ===/g, '');
      elements.push(
        new Paragraph({
          children: [new TextRun({ 
            text: headerText, 
            bold: true,
            size: 28,
            color: "2E86AB", // Azul
            underline: {
              type: UnderlineType.SINGLE,
              color: "2E86AB"
            }
          })],
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 240,
            after: 120
          }
        })
      );
      continue;
    }
    
    // Encabezados nivel 2 (números con paréntesis)
    if (trimmedLine.match(/^\d+\)\s/)) {
      flushCurrentList();
      const headerText = trimmedLine.replace(/^\d+\)\s/, '');
      elements.push(
        new Paragraph({
          children: [new TextRun({ 
            text: headerText, 
            bold: true,
            size: 22,
            color: "A23B72" // Morado
          })],
          heading: HeadingLevel.HEADING_3,
          spacing: {
            before: 180,
            after: 90
          }
        })
      );
      continue;
    }
    
    // Detectar nivel de indentación para listas anidadas
    const indentMatch = line.match(/^(\s*)/);
    const currentIndent = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;
    
    // Casillas de verificación ([ ])
    if (trimmedLine.match(/^\s*\[\s*\]\s/)) {
      flushCurrentList();
      const checkboxText = trimmedLine.replace(/^\s*\[\s*\]\s/, '');
      const children = processTextFormatting(`☐ ${checkboxText}`);
      elements.push(new Paragraph({ 
        children,
        alignment: AlignmentType.LEFT,
        spacing: {
          before: 60,
          after: 60
        },
        indent: {
          left: 360 // Indentación para las casillas
        }
      }));
      continue;
    }
    
    // Listas con viñetas (- o •)
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
      if (listType !== 'bullet' || listLevel !== currentIndent) {
        flushCurrentList();
        listType = 'bullet';
        listLevel = currentIndent;
      }
      currentList.push({ text: trimmedLine.replace(/^[-•]\s/, ''), level: currentIndent });
      continue;
    }
    
    // Listas numeradas
    if (trimmedLine.match(/^\d+\.\s/)) {
      if (listType !== 'number' || listLevel !== currentIndent) {
        flushCurrentList();
        listType = 'number';
        listLevel = currentIndent;
      }
      currentList.push({ text: trimmedLine.replace(/^\d+\.\s/, ''), level: currentIndent });
      continue;
    }
    
    // Texto normal
    flushCurrentList();
    
    // Procesar formato de texto (negrita, cursiva, etc.)// Párrafos normales
    const children = processTextFormatting(trimmedLine);
    elements.push(new Paragraph({ 
      children,
      alignment: AlignmentType.JUSTIFIED,
      spacing: {
        before: 80,
        after: 80
      }
    }));
  }
  
  flushCurrentList();
  
  function flushCurrentList() {
    if (currentList.length > 0) {
      currentList.forEach((item) => {
        const children = processTextFormatting(item.text);
        elements.push(
          new Paragraph({
            children,
            bullet: listType === 'bullet' ? { level: item.level } : undefined,
            numbering: listType === 'number' ? { reference: 'default', level: item.level } : undefined,
            alignment: AlignmentType.LEFT,
            spacing: {
              before: 60,
              after: 60
            },
            indent: {
              left: 360 + (item.level * 360), // Indentación progresiva para niveles anidados
              hanging: 180 // Sangría francesa para las viñetas
            }
          })
        );
      });
      currentList = [];
      listType = null;
      listLevel = 0;
    }
  }
  
  function processTextFormatting(text: string): TextRun[] {
    const children: TextRun[] = [];
    
    // Limpiar etiquetas HTML del texto antes de procesar
    let cleanText = text
      .replace(/<[^>]*>/g, '') // Eliminar todas las etiquetas HTML
      .replace(/&lt;/g, '<')   // Decodificar entidades HTML
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    let remainingText = cleanText;
    
    // Procesar texto con formato combinado (negrita, cursiva)
    while (remainingText.length > 0) {
      // Buscar texto en negrita (**texto**)
      const boldMatch = remainingText.match(/^(.*?)\*\*(.*?)\*\*(.*)$/);
      if (boldMatch) {
        // Texto antes de la negrita
        if (boldMatch[1]) {
          children.push(...processItalicText(boldMatch[1]));
        }
        // Texto en negrita
        children.push(...processItalicText(boldMatch[2], true));
        remainingText = boldMatch[3];
        continue;
      }
      
      // Si no hay más formato, procesar el resto como texto normal/cursiva
      children.push(...processItalicText(remainingText));
      break;
    }
    
    return children;
  }
  
  function processItalicText(text: string, bold: boolean = false): TextRun[] {
    const children: TextRun[] = [];
    
    // Procesar cursiva (*texto*)
    const parts = text.split(/\*(.*?)\*/);
    
    for (let j = 0; j < parts.length; j++) {
      if (parts[j]) {
        if (j % 2 === 0) {
          // Texto normal
          children.push(new TextRun({ text: parts[j], bold, italics: false }));
        } else {
          // Texto en cursiva
          children.push(new TextRun({ text: parts[j], bold, italics: true }));
        }
      }
    }
    
    // Si no hay cursiva, devolver como texto normal
    if (children.length === 0 && text) {
      children.push(new TextRun({ text, bold }));
    }
    
    return children;
  }
  
  return elements;
}
