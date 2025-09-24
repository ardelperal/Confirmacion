const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } = require('docx');
const fs = require('fs');

// Función para convertir contenido markdown a DOCX (simplificada)
function convertContentToDocx(content) {
  const children = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      children.push(new Paragraph({ text: '' }));
      continue;
    }
    
    // Salto de página
    if (line === '---pagebreak---') {
      children.push(new Paragraph({
        children: [new PageBreak()]
      }));
      continue;
    }
    
    // Encabezados
    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        text: line.substring(2),
        heading: HeadingLevel.HEADING_1
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        text: line.substring(3),
        heading: HeadingLevel.HEADING_2
      }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({
        text: line.substring(4),
        heading: HeadingLevel.HEADING_3
      }));
    } else if (line.startsWith('#### ')) {
      children.push(new Paragraph({
        text: line.substring(5),
        heading: HeadingLevel.HEADING_4
      }));
    }
    // Listas con viñetas
    else if (line.startsWith('- ')) {
      children.push(new Paragraph({
        text: line.substring(2),
        bullet: {
          level: 0
        }
      }));
    }
    // Listas numeradas
    else if (/^\d+\.\s/.test(line)) {
      children.push(new Paragraph({
        text: line.replace(/^\d+\.\s/, ''),
        numbering: {
          reference: 'default-numbering',
          level: 0
        }
      }));
    }
    // Texto con formato
    else if (line.includes('**') || line.includes('*')) {
      const textRuns = [];
      let currentText = '';
      let isBold = false;
      let isItalic = false;
      
      for (let j = 0; j < line.length; j++) {
        if (line[j] === '*' && line[j + 1] === '*') {
          if (currentText) {
            textRuns.push(new TextRun({
              text: currentText,
              bold: isBold,
              italics: isItalic
            }));
            currentText = '';
          }
          isBold = !isBold;
          j++; // Skip next *
        } else if (line[j] === '*') {
          if (currentText) {
            textRuns.push(new TextRun({
              text: currentText,
              bold: isBold,
              italics: isItalic
            }));
            currentText = '';
          }
          isItalic = !isItalic;
        } else {
          currentText += line[j];
        }
      }
      
      if (currentText) {
        textRuns.push(new TextRun({
          text: currentText,
          bold: isBold,
          italics: isItalic
        }));
      }
      
      children.push(new Paragraph({
        children: textRuns
      }));
    }
    // Texto normal
    else {
      children.push(new Paragraph({
        text: line
      }));
    }
  }
  
  return children;
}

// Contenido de prueba con elementos problemáticos potenciales
const testContents = {
  // Test 1: YAML frontmatter
  yamlFrontmatter: `---
code: D3
title: Oración personal y comunitaria
module: D
duration: 60
objective: Valorar tanto la oración íntima con Dios como la oración en comunidad.
materials:
  - Biblia marcada
  - Papel A4
biblical_references:
  - 'Mt 18,20'
  - 'Mc 1,35'
key_terms:
  intimidad: Relación personal y cercana con Dios
  comunión: Unión de corazones en la oración común
---

# Título de prueba
Este es contenido después del YAML frontmatter.`,

  // Test 2: Saltos de página
  pageBreaks: `# Título 1
Contenido de la primera página.

---pagebreak---

# Título 2
Contenido de la segunda página.`,

  // Test 3: Listas complejas con formato
  complexLists: `### Pasos:
1. 5 minutos de oración personal en silencio (con música suave)
2. Compartir brevemente cómo se sintieron
3. 5 minutos de oración comunitaria (oraciones espontáneas)
4. Reflexionar sobre las diferencias entre ambas experiencias

**Variante sin contacto:** Mantener distancia durante la oración comunitaria.

- **Intimidad:** Relación personal y cercana con Dios
- **Comunión:** Unión de corazones en la oración común
- **Liturgia:** Oración oficial de la Iglesia`,

  // Test 4: Texto con formato complejo
  complexFormatting: `**Texto bíblico:** (Mt 18,20) "Donde dos o tres se reúnen en mi nombre, allí estoy yo en medio de ellos"

**Guía:** Jesús está presente cuando oramos solos y cuando oramos juntos.

**Preguntas:**
- ¿Prefieres orar solo o acompañado? ¿Por qué?
- ¿Qué ventajas tiene cada tipo de oración?
- ¿Cómo te sientes cuando oras en la misa?

**Sugerencia de testimonio:** El catequista comparte una experiencia de oración comunitaria que le marcó (retiro, vigilia, etc.).`,

  // Test 5: Checkboxes
  checkboxes: `### EVALUACIÓN RÁPIDA (catequista)
- [ ] Repiten la idea clave con sus palabras
- [ ] Identifican 1 cita bíblica del tema
- [ ] Asumen un compromiso concreto y realista`
};

async function generateTestFiles() {
  console.log('Generando archivos de prueba para identificar el problema...');
  
  for (const [testName, content] of Object.entries(testContents)) {
    try {
      const doc = new Document({
        creator: "Sistema de Catequesis",
        title: `Test ${testName}`,
        description: "Archivo de prueba para identificar problemas",
        compatibility: {
          version: 15
        },
        numbering: {
          config: [{
            reference: 'default-numbering',
            levels: [{
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.START
            }]
          }]
        },
        sections: [{
          properties: {},
          children: convertContentToDocx(content)
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      const filename = `test-${testName}.docx`;
      fs.writeFileSync(filename, buffer);
      console.log(`✓ Generado: ${filename} (${buffer.length} bytes)`);
      
    } catch (error) {
      console.error(`✗ Error generando ${testName}:`, error.message);
    }
  }
  
  console.log('\nArchivos generados. Prueba cada uno en Word para identificar cuál causa el problema.');
}

generateTestFiles().catch(console.error);