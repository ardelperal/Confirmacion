import matter from 'gray-matter';
import { marked } from 'marked';
import { ParsedMarkdown } from '@/types';

/**
 * Configuración personalizada de marked para el contenido de catequesis
 */
function configureMarked() {
  const renderer = new marked.Renderer();
  
  // Personalizar el renderizado de encabezados
  renderer.heading = (text: string, level: number) => {
    const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
    return `<h${level} id="${escapedText}" class="session-heading session-heading-${level}">${text}</h${level}>\n`;
  };
  
  // Personalizar el renderizado de párrafos
  renderer.paragraph = (text: string) => {
    return `<p class="session-paragraph">${text}</p>\n`;
  };
  
  // Personalizar el renderizado de listas
  renderer.list = (body: string, ordered: boolean) => {
    const type = ordered ? 'ol' : 'ul';
    const className = ordered ? 'session-list-ordered' : 'session-list-unordered';
    return `<${type} class="${className}">${body}</${type}>\n`;
  };
  
  renderer.listitem = (text: string) => {
    return `<li class="session-list-item">${text}</li>\n`;
  };
  
  // Personalizar el renderizado de bloques de código
  renderer.blockquote = (quote: string) => {
    return `<blockquote class="session-quote">${quote}</blockquote>\n`;
  };
  
  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
    sanitize: false
  });
}

/**
 * Convierte los marcadores ---pagebreak--- en divs con clase pagebreak
 * @param content Contenido markdown
 * @returns Contenido con pagebreaks convertidos
 */
export function convertPagebreaks(content: string): string {
  return content.replace(/^---pagebreak---$/gm, '<div class="pagebreak"></div>');
}

/**
 * Procesa el contenido markdown después de la conversión a HTML
 * @param html HTML generado por marked
 * @returns HTML procesado con clases adicionales
 */
function postProcessHtml(html: string): string {
  // Agregar clases a elementos específicos de sesiones
  html = html.replace(/<h3>OBJETIVO<\/h3>/g, '<h3 class="session-objective-title">OBJETIVO</h3>');
  html = html.replace(/<h3>MATERIALES<\/h3>/g, '<h3 class="session-materials-title">MATERIALES</h3>');
  html = html.replace(/<h3>ESQUEMA<\/h3>/g, '<h3 class="session-schema-title">ESQUEMA</h3>');
  html = html.replace(/<h3>EVALUACIÓN RÁPIDA<\/h3>/g, '<h3 class="session-evaluation-title">EVALUACIÓN RÁPIDA</h3>');
  html = html.replace(/<h3>PARA CASA<\/h3>/g, '<h3 class="session-homework-title">PARA CASA</h3>');
  html = html.replace(/<h3>NOTAS AL CATEQUISTA<\/h3>/g, '<h3 class="session-notes-title">NOTAS AL CATEQUISTA</h3>');
  
  // Agregar clases a bloques de tiempo
  html = html.replace(/([0-9]+)\s*min/g, '<span class="time-indicator">$1 min</span>');
  
  // Agregar clases a referencias bíblicas (formato: (Ref 1:1))
  html = html.replace(/\(([A-Za-z0-9\s]+\s[0-9]+:[0-9]+[^)]*?)\)/g, '<span class="biblical-reference">($1)</span>');
  
  // Agregar clases a referencias del Catecismo (formato: (CIC 123))
  html = html.replace(/\(CIC\s([0-9]+(?:-[0-9]+)?)\)/g, '<span class="catechism-reference">(CIC $1)</span>');
  
  return html;
}

/**
 * Parsea un archivo markdown con front-matter YAML
 * @param fileContent Contenido completo del archivo markdown
 * @returns Objeto con front-matter y contenido parseado
 */
export function parseMarkdown(fileContent: string): ParsedMarkdown {
  // Configurar marked si no se ha hecho
  configureMarked();
  
  // Parsear front-matter
  const { data: frontMatter, content } = matter(fileContent);
  
  // Convertir pagebreaks
  const contentWithPagebreaks = convertPagebreaks(content);
  
  // Convertir markdown a HTML
  let htmlContent = marked(contentWithPagebreaks) as string;
  
  // Post-procesar HTML
  htmlContent = postProcessHtml(htmlContent);
  
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
  const requiredFields = ['code', 'title', 'module', 'duration', 'objective'];
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