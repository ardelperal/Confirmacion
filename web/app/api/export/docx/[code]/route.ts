import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
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

    // Procesar el contenido markdown a texto plano
    const processContent = (content: string): Paragraph[] => {
      const lines = content.split('\n');
      const paragraphs: Paragraph[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) {
          // Línea vacía
          paragraphs.push(new Paragraph({ text: '' }));
          continue;
        }
        
        if (line === '---pagebreak---') {
          // Salto de página
          paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
          continue;
        }
        
        if (line.startsWith('===') && line.endsWith('===')) {
          // Título principal
          const title = line.replace(/===/g, '').trim();
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: title, bold: true, size: 32 })],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            })
          );
          continue;
        }
        
        if (line.startsWith('##')) {
          // Subtítulo
          const subtitle = line.replace(/##/g, '').trim();
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: subtitle, bold: true, size: 24 })],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 200 }
            })
          );
          continue;
        }
        
        if (line.startsWith('#')) {
          // Título de sección
          const sectionTitle = line.replace(/#/g, '').trim();
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: sectionTitle, bold: true, size: 20 })],
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 }
            })
          );
          continue;
        }
        
        if (line.startsWith('- ') || line.startsWith('* ')) {
          // Lista con viñetas
          const listItem = line.substring(2).trim();
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${listItem}` })],
              indent: { left: 400 },
              spacing: { after: 100 }
            })
          );
          continue;
        }
        
        if (/^\d+\)/.test(line)) {
          // Lista numerada
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: line })],
              indent: { left: 400 },
              spacing: { after: 100 }
            })
          );
          continue;
        }
        
        if (line.includes('**') || line.includes('*')) {
          // Texto con formato
          const parts = line.split(/\*\*(.*?)\*\*|\*(.*?)\*/g);
          const children: TextRun[] = [];
          
          for (let j = 0; j < parts.length; j++) {
            if (j % 3 === 0) {
              // Texto normal
              if (parts[j]) {
                children.push(new TextRun({ text: parts[j] }));
              }
            } else if (j % 3 === 1 && parts[j]) {
              // Texto en negrita (**texto**)
              children.push(new TextRun({ text: parts[j], bold: true }));
            } else if (j % 3 === 2 && parts[j]) {
              // Texto en cursiva (*texto*)
              children.push(new TextRun({ text: parts[j], italics: true }));
            }
          }
          
          paragraphs.push(
            new Paragraph({
              children: children.length > 0 ? children : [new TextRun({ text: line })],
              spacing: { after: 100 }
            })
          );
          continue;
        }
        
        // Párrafo normal
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line })],
            spacing: { after: 100 }
          })
        );
      }
      
      return paragraphs;
    };

    // Crear el documento
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: '2cm',
                right: '2cm',
                bottom: '2cm',
                left: '2cm'
              }
            }
          },
          children: [
            // Encabezado del documento
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Curso de Confirmación (12–13)',
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Sesión ${session.code}: ${session.title}`,
                  bold: true,
                  size: 24
                })
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            // Contenido procesado
            ...processContent(session.content)
          ]
        }
      ]
    });

    // Generar el buffer del documento
    const buffer = await Packer.toBuffer(doc);

    // Retornar el DOCX
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="sesion-${code}.docx"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error generando DOCX:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}