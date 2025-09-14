import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { ParsedMarkdown } from '@/types';

/**
 * Procesador unificado para convertir markdown a HTML
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify);

/**
 * Convierte los marcadores ---pagebreak--- en divs con clase pagebreak
 * @param content Contenido markdown
 * @returns Contenido con pagebreaks convertidos
 */
export function convertPagebreaks(content: string): string {
  return content.replace(/---pagebreak---/g, '<div class="pagebreak"></div>');
}

/**
 * Post-procesa el HTML para agregar clases CSS específicas
 * @param html HTML generado
 * @returns HTML con clases CSS agregadas
 */
function postProcessHtml(html: string): string {
  let processed = html;
  
  // Agregar clases CSS para impresión y estilo
  processed = processed.replace(/<h1>/g, '<h1 class="session-title">');
  processed = processed.replace(/<h2>/g, '<h2 class="session-section">');
  processed = processed.replace(/<h3>/g, '<h3 class="session-subsection">');
  processed = processed.replace(/<p>/g, '<p class="session-text">');
  processed = processed.replace(/<ul>/g, '<ul class="session-list">');
  processed = processed.replace(/<ol>/g, '<ol class="session-list session-list-ordered">');
  processed = processed.replace(/<li>/g, '<li class="session-list-item">');
  processed = processed.replace(/<blockquote>/g, '<blockquote class="session-quote">');
  processed = processed.replace(/<table>/g, '<table class="session-table">');
  
  // Agregar clases a elementos específicos de sesiones
  processed = processed.replace(/<h3 class="session-subsection">OBJETIVO<\/h3>/g, '<h3 class="session-objective-title">OBJETIVO</h3>');
  processed = processed.replace(/<h3 class="session-subsection">MATERIALES<\/h3>/g, '<h3 class="session-materials-title">MATERIALES</h3>');
  processed = processed.replace(/<h3 class="session-subsection">ESQUEMA<\/h3>/g, '<h3 class="session-schema-title">ESQUEMA</h3>');
  processed = processed.replace(/<h3 class="session-subsection">EVALUACIÓN RÁPIDA<\/h3>/g, '<h3 class="session-evaluation-title">EVALUACIÓN RÁPIDA</h3>');
  processed = processed.replace(/<h3 class="session-subsection">PARA CASA<\/h3>/g, '<h3 class="session-homework-title">PARA CASA</h3>');
  processed = processed.replace(/<h3 class="session-subsection">NOTAS AL CATEQUISTA<\/h3>/g, '<h3 class="session-notes-title">NOTAS AL CATEQUISTA</h3>');
  
  // Agregar clases a bloques de tiempo
  processed = processed.replace(/([0-9]+)\s*min/g, '<span class="time-indicator">$1 min</span>');
  
  // Agregar clases a referencias bíblicas (formato: (Ref 1:1))
  processed = processed.replace(/\(([A-Za-z0-9\s]+\s[0-9]+:[0-9]+[^)]*?)\)/g, '<span class="biblical-reference">($1)</span>');
  
  // Agregar clases a referencias del Catecismo (formato: (CIC 123))
  processed = processed.replace(/\(CIC\s([0-9]+(?:-[0-9]+)?)\)/g, '<span class="catechism-reference">(CIC $1)</span>');
  
  return processed;
}

/**
 * Parsea un archivo markdown con front-matter YAML
 * @param fileContent Contenido completo del archivo markdown
 * @returns Objeto con front-matter y contenido parseado
 */
export async function parseMarkdown(fileContent: string): Promise<ParsedMarkdown> {
  // Parsear front matter
  const { data: frontMatter, content } = matter(fileContent);
  
  // Convertir pagebreaks antes del procesamiento
  const contentWithPagebreaks = convertPagebreaks(content);
  
  // Convertir markdown a HTML usando remark/rehype
  const result = await processor.process(contentWithPagebreaks);
  const rawHtml = String(result);
  
  // Post-procesar HTML
  const htmlContent = postProcessHtml(rawHtml);
  
  return {
    frontMatter,
    content: contentWithPagebreaks,
    htmlContent
  };
}

/**
 * Valida que el front-matter tenga los campos requeridos para una sesión
 * @param frontMatter Datos del front-matter
 * @returns true si es válido, false en caso contrario
 */
export function validateSessionFrontMatter(frontMatter: any): boolean {
  const requiredFields = ['code', 'title', 'module', 'duration'];
  return requiredFields.every(field => frontMatter.hasOwnProperty(field) && frontMatter[field]);
}

/**
 * Extrae el código de sesión del nombre de archivo
 * @param filename Nombre del archivo (ej: "A1.md", "session-A1.md")
 * @returns Código de sesión (ej: "A1")
 */
export function extractSessionCode(filename: string): string | null {
  const match = filename.match(/([A-F][1-4])/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Extrae el código de módulo del código de sesión
 * @param sessionCode Código de sesión (ej: "A1")
 * @returns Código de módulo (ej: "A")
 */
export function extractModuleCode(sessionCode: string): string {
  return sessionCode.charAt(0).toUpperCase();
}