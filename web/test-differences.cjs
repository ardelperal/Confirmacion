const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, NumberFormat } = require('docx');
const fs = require('fs');
const path = require('path');

// Leer el contenido real de la sesión D3.md
const sessionPath = path.join(__dirname, '..', 'data', 'content', 'sessions', 'D3.md');
const sessionContent = fs.readFileSync(sessionPath, 'utf8');

console.log('Probando diferencias específicas entre código original y de prueba...\n');

// DIFERENCIA 1: PageBreak vs Paragraph con pageBreakBefore
async function testPageBreakDifference() {
  console.log('1. Probando PageBreak vs Paragraph con pageBreakBefore...');
  
  const content = `# Título
Texto antes del salto.
---
# Después del salto
Texto después del salto.`;

  // Versión original (problemática)
  const docOriginal = new Document({
    creator: "Test",
    title: "Test PageBreak Original",
    compatibility: { version: 15 },
    sections: [{
      properties: {
        page: {
          size: { orientation: 'portrait', width: '210mm', height: '297mm' },
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
        }
      },
      children: [
        new Paragraph({ children: [new TextRun({ text: "Título", bold: true })], heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun({ text: "Texto antes del salto." })] }),
        new PageBreak(), // ← DIFERENCIA: PageBreak directo
        new Paragraph({ children: [new TextRun({ text: "Después del salto", bold: true })], heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun({ text: "Texto después del salto." })] })
      ]
    }]
  });

  // Versión de prueba (funciona)
  const docPrueba = new Document({
    creator: "Test",
    title: "Test PageBreak Prueba",
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: "Título", bold: true })], heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun({ text: "Texto antes del salto." })] }),
        new Paragraph({ children: [new TextRun({ text: '', break: 1 })], pageBreakBefore: true }), // ← DIFERENCIA: Paragraph con pageBreakBefore
        new Paragraph({ children: [new TextRun({ text: "Después del salto", bold: true })], heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun({ text: "Texto después del salto." })] })
      ]
    }]
  });

  const bufferOriginal = await Packer.toBuffer(docOriginal);
  const bufferPrueba = await Packer.toBuffer(docPrueba);
  
  fs.writeFileSync('test-pagebreak-original.docx', bufferOriginal);
  fs.writeFileSync('test-pagebreak-prueba.docx', bufferPrueba);
  
  console.log(`   ✓ test-pagebreak-original.docx (${bufferOriginal.length} bytes)`);
  console.log(`   ✓ test-pagebreak-prueba.docx (${bufferPrueba.length} bytes)`);
}

// DIFERENCIA 2: Configuración de página compleja vs simple
async function testPageConfigDifference() {
  console.log('2. Probando configuración de página compleja vs simple...');
  
  // Versión original (problemática)
  const docOriginal = new Document({
    creator: "Sistema de Confirmación",
    title: "Test Config Original",
    description: "Descripción completa",
    compatibility: { version: 15 },
    numbering: {
      config: [{
        reference: 'default',
        levels: [{
          level: 0,
          format: 'decimal',
          text: '%1.',
          alignment: 'start',
          style: { paragraph: { indent: { left: 720, hanging: 260 } } }
        }]
      }]
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: 'portrait', width: '210mm', height: '297mm' },
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
        }
      },
      children: [
        new Paragraph({ children: [new TextRun({ text: "Contenido de prueba" })] })
      ]
    }]
  });

  // Versión de prueba (funciona)
  const docPrueba = new Document({
    creator: "Test",
    title: "Test Config Prueba",
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: "Contenido de prueba" })] })
      ]
    }]
  });

  const bufferOriginal = await Packer.toBuffer(docOriginal);
  const bufferPrueba = await Packer.toBuffer(docPrueba);
  
  fs.writeFileSync('test-config-original.docx', bufferOriginal);
  fs.writeFileSync('test-config-prueba.docx', bufferPrueba);
  
  console.log(`   ✓ test-config-original.docx (${bufferOriginal.length} bytes)`);
  console.log(`   ✓ test-config-prueba.docx (${bufferPrueba.length} bytes)`);
}

// DIFERENCIA 3: AlignmentType.JUSTIFIED vs sin alignment
async function testAlignmentDifference() {
  console.log('3. Probando AlignmentType.JUSTIFIED vs sin alignment...');
  
  // Versión original (problemática)
  const docOriginal = new Document({
    creator: "Test",
    title: "Test Alignment Original",
    sections: [{
      properties: {},
      children: [
        new Paragraph({ 
          children: [new TextRun({ text: "Texto con alineación justificada que puede causar problemas en Word." })],
          alignment: AlignmentType.JUSTIFIED // ← DIFERENCIA: Alignment justificado
        })
      ]
    }]
  });

  // Versión de prueba (funciona)
  const docPrueba = new Document({
    creator: "Test",
    title: "Test Alignment Prueba",
    sections: [{
      properties: {},
      children: [
        new Paragraph({ 
          children: [new TextRun({ text: "Texto sin alineación específica." })]
          // ← DIFERENCIA: Sin alignment
        })
      ]
    }]
  });

  const bufferOriginal = await Packer.toBuffer(docOriginal);
  const bufferPrueba = await Packer.toBuffer(docPrueba);
  
  fs.writeFileSync('test-alignment-original.docx', bufferOriginal);
  fs.writeFileSync('test-alignment-prueba.docx', bufferPrueba);
  
  console.log(`   ✓ test-alignment-original.docx (${bufferOriginal.length} bytes)`);
  console.log(`   ✓ test-alignment-prueba.docx (${bufferPrueba.length} bytes)`);
}

async function runAllTests() {
  try {
    await testPageBreakDifference();
    await testPageConfigDifference();
    await testAlignmentDifference();
    
    console.log('\n🔍 Archivos generados para probar:');
    console.log('   - test-pagebreak-original.docx vs test-pagebreak-prueba.docx');
    console.log('   - test-config-original.docx vs test-config-prueba.docx');
    console.log('   - test-alignment-original.docx vs test-alignment-prueba.docx');
    console.log('\nPrueba cada par para identificar cuál causa el problema.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runAllTests();