import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/content-loader';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, AlignmentType } from 'docx';

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
              top: '20mm',
              right: '20mm',
              bottom: '20mm',
              left: '20mm'
            }
          }
        },
        children: convertContentToDocx(session.content, session.frontMatter.title, session.frontMatter.code)
      }]
    });

    // Generar buffer del documento
    const buffer = await Packer.toBuffer(doc);
    
    // Generar nombre de archivo
    const slug = session.frontMatter.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const filename = `${code.toLowerCase()}_${slug}.docx`;

    // Devolver DOCX
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Error generating DOCX:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function convertContentToDocx(content: string, title: string, code: string): any[] {
  const elements: (Paragraph | PageBreak)[] = [];
  
  // Título principal
  elements.push(
    new Paragraph({
      text: `Curso de Confirmación (12–13)`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      text: `Sesión ${code}: ${title}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({ text: '' }) // Espacio
  );

  // Procesar contenido línea por línea
  const lines = content.split('\n');
  let currentList: Array<{ text: string; level: number }> = [];
  let listType: 'bullet' | 'number' | null = null;
  let listLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Salto de página
    if (trimmedLine === '---pagebreak---') {
      flushCurrentList();
      elements.push(new PageBreak());
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
      
      switch (level) {
        case 1: headingLevel = HeadingLevel.HEADING_1; break;
        case 2: headingLevel = HeadingLevel.HEADING_2; break;
        case 3: headingLevel = HeadingLevel.HEADING_3; break;
        case 4: headingLevel = HeadingLevel.HEADING_4; break;
        default: headingLevel = HeadingLevel.HEADING_4;
      }
      
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: headerText, bold: true })],
          heading: headingLevel
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
          children: [new TextRun({ text: headerText, bold: true })],
          heading: HeadingLevel.HEADING_2
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
          children: [new TextRun({ text: headerText, bold: true })],
          heading: HeadingLevel.HEADING_3
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
        alignment: AlignmentType.JUSTIFIED
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
    
    // Procesar formato de texto (negrita, cursiva, etc.)
    const children = processTextFormatting(trimmedLine);
    elements.push(new Paragraph({ 
      children,
      alignment: AlignmentType.JUSTIFIED
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
            alignment: AlignmentType.JUSTIFIED
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
    let remainingText = text;
    
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