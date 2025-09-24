const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, NumberFormat } = require('docx');
const fs = require('fs');
const path = require('path');

// Leer el contenido real de la sesión D3.md
const sessionPath = path.join(__dirname, '..', 'data', 'content', 'sessions', 'D3.md');
const sessionContent = fs.readFileSync(sessionPath, 'utf8');

console.log('Contenido de la sesión D3.md:');
console.log('Longitud:', sessionContent.length, 'caracteres');
console.log('Primeras 500 caracteres:');
console.log(sessionContent.substring(0, 500));
console.log('\n---\n');

// Función simplificada de conversión (copiada del código original)
function convertContentToDocx(content) {
  const lines = content.split('\n');
  const elements = [];
  let listLevel = 0;
  let numbering = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Salto de página
    if (line.trim() === '---') {
      elements.push(new Paragraph({
        children: [new TextRun({ text: '', break: 1 })],
        pageBreakBefore: true
      }));
      continue;
    }

    // Línea vacía
    if (line.trim() === '') {
      elements.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
      continue;
    }

    // Encabezados markdown
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)[0].length;
      const text = line.replace(/^#+\s*/, '');
      
      if (level === 1) {
        elements.push(new Paragraph({
          children: [new TextRun({ text, bold: true, size: 32 })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
        }));
      } else if (level === 2) {
        elements.push(new Paragraph({
          children: [new TextRun({ text, bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_2
        }));
      } else {
        elements.push(new Paragraph({
          children: [new TextRun({ text, bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_3
        }));
      }
      continue;
    }

    // Listas con viñetas
    if (line.match(/^\s*[-*+]\s/)) {
      const indent = (line.match(/^\s*/)[0].length / 2);
      const text = line.replace(/^\s*[-*+]\s*/, '');
      
      elements.push(new Paragraph({
        children: [new TextRun({ text })],
        bullet: { level: Math.min(indent, 8) }
      }));
      continue;
    }

    // Listas numeradas
    if (line.match(/^\s*\d+\.\s/)) {
      const indent = (line.match(/^\s*/)[0].length / 2);
      const text = line.replace(/^\s*\d+\.\s*/, '');
      
      elements.push(new Paragraph({
        children: [new TextRun({ text })],
        numbering: {
          reference: "default-numbering",
          level: Math.min(indent, 8)
        }
      }));
      continue;
    }

    // Checkboxes
    if (line.match(/^\s*-\s*\[\s*\]\s/)) {
      const text = line.replace(/^\s*-\s*\[\s*\]\s*/, '☐ ');
      elements.push(new Paragraph({
        children: [new TextRun({ text })]
      }));
      continue;
    }

    if (line.match(/^\s*-\s*\[x\]\s/i)) {
      const text = line.replace(/^\s*-\s*\[x\]\s*/i, '☑ ');
      elements.push(new Paragraph({
        children: [new TextRun({ text })]
      }));
      continue;
    }

    // Texto normal con formato
    let processedText = line;
    
    // Limpiar etiquetas HTML básicas
    processedText = processedText.replace(/<\/?[^>]+(>|$)/g, '');
    
    // Procesar formato markdown básico
    const textRuns = [];
    let currentText = processedText;
    
    // Texto en negrita
    currentText = currentText.replace(/\*\*(.*?)\*\*/g, (match, text) => {
      textRuns.push(new TextRun({ text, bold: true }));
      return '|||BOLD|||';
    });
    
    // Texto en cursiva
    currentText = currentText.replace(/\*(.*?)\*/g, (match, text) => {
      textRuns.push(new TextRun({ text, italics: true }));
      return '|||ITALIC|||';
    });
    
    if (textRuns.length === 0) {
      textRuns.push(new TextRun({ text: currentText }));
    } else {
      // Reconstruir el texto con los runs formateados
      const parts = currentText.split(/\|\|\|(BOLD|ITALIC)\|\|\|/);
      let runIndex = 0;
      
      for (let j = 0; j < parts.length; j++) {
        if (parts[j] === 'BOLD' || parts[j] === 'ITALIC') {
          // Skip, ya procesado
        } else if (parts[j]) {
          textRuns.splice(runIndex, 0, new TextRun({ text: parts[j] }));
          runIndex++;
        }
        if (parts[j] === 'BOLD' || parts[j] === 'ITALIC') {
          runIndex++;
        }
      }
    }
    
    elements.push(new Paragraph({ children: textRuns }));
  }

  return elements;
}

async function generateTestFile() {
  try {
    console.log('Procesando contenido de la sesión...');
    
    const docElements = convertContentToDocx(sessionContent);
    
    console.log('Elementos generados:', docElements.length);
    
    const doc = new Document({
      creator: "Sistema de Catequesis",
      title: "Sesión D3 - Prueba",
      description: "Archivo de prueba con contenido real de sesión",
      sections: [{
        properties: {},
        children: docElements
      }],
      numbering: {
        config: [{
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: NumberFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
            }
          ]
        }]
      }
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = 'test-real-session-D3.docx';
    
    fs.writeFileSync(filename, buffer);
    console.log(`✓ Generado: ${filename} (${buffer.length} bytes)`);
    
    console.log('\nPrueba este archivo en Word para reproducir el error.');
    
  } catch (error) {
    console.error('Error al generar el archivo:', error);
    console.error('Stack:', error.stack);
  }
}

generateTestFile();