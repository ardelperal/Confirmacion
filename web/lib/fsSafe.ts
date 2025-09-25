/**
 * Utilidades para acceso seguro al sistema de archivos
 * Garantiza que todas las operaciones de archivos se mantengan dentro del directorio de contenido
 */

import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Detectar la carpeta raíz de contenido considerando distintos entornos (dev, build standalone, Docker)
const FALLBACK_CONTENT_DIR = path.resolve(process.cwd(), '../data/content');

const candidateContentRoots = [
  process.env.CONTENT_ROOT,
  '/app/content',
  '/data/content',
  FALLBACK_CONTENT_DIR,
  path.resolve(process.cwd(), 'data/content'),
  path.resolve(process.cwd(), '../data/content'),
  path.resolve(process.cwd(), 'content'),
  path.resolve(process.cwd(), '../content')
].filter((dir): dir is string => Boolean(dir));

function locateContentRoot(): string {
  for (const dir of candidateContentRoots) {
    try {
      if (existsSync(dir)) {
        return dir;
      }
    } catch {
      // Ignorar errores de acceso y continuar con el siguiente candidato
    }
  }

  // Si ningún candidato existe, devolver el fallback original (puede no existir hasta que se sincronice el contenido)
  return FALLBACK_CONTENT_DIR;
}

const DATA_CONTENT_DIR = locateContentRoot();

export function getContentRoot(): string {
  return DATA_CONTENT_DIR;
}

const candidateDataRoots = [
  process.env.DATA_ROOT,
  '/app/data',
  '/data',
  path.resolve(process.cwd(), 'data'),
  path.resolve(process.cwd(), '../data'),
  path.resolve(DATA_CONTENT_DIR, '..')
].filter((dir): dir is string => Boolean(dir));

function locateDataRoot(): string {
  for (const dir of candidateDataRoots) {
    try {
      if (existsSync(dir)) {
        return dir;
      }
    } catch {
      // Ignorar y seguir
    }
  }

  return path.resolve(DATA_CONTENT_DIR, '..');
}

const DATA_ROOT_DIR = locateDataRoot();

export function getDataRoot(): string {
  return DATA_ROOT_DIR;
}

/**
 * Resuelve una ruta de contenido de forma segura
 * Garantiza que la ruta resultante esté dentro de DATA_CONTENT_DIR
 * @param segments - Segmentos de ruta a resolver
 * @returns Ruta absoluta normalizada dentro del directorio de contenido
 * @throws Error si la ruta resuelve fuera del directorio permitido
 */
export function resolveContentPath(...segments: string[]): string {
  // Filtrar segmentos vacíos o nulos
  const cleanSegments = segments.filter(segment => segment && typeof segment === 'string');
  
  if (cleanSegments.length === 0) {
    return DATA_CONTENT_DIR;
  }
  
  // Resolver la ruta completa
  const resolvedPath = path.resolve(DATA_CONTENT_DIR, ...cleanSegments);
  
  // Normalizar para eliminar .. y . 
  const normalizedPath = path.normalize(resolvedPath);
  
  // Verificar que la ruta esté dentro del directorio permitido
  const relativePath = path.relative(DATA_CONTENT_DIR, normalizedPath);
  
  // Si relativePath empieza con .. significa que está fuera del directorio
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    const error = new Error(`Access denied: Path '${segments.join('/')}' resolves outside content directory`);
    (error as any).status = 403;
    throw error;
  }
  
  return normalizedPath;
}

/**
 * Lee un archivo de contenido de forma segura
 * @param segments - Segmentos de ruta del archivo
 * @returns Contenido del archivo como string
 */
export async function readContentFile(...segments: string[]): Promise<string> {
  const filePath = resolveContentPath(...segments);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const notFoundError = new Error(`Content file not found: ${segments.join('/')}`);
      (notFoundError as any).status = 404;
      throw notFoundError;
    }
    throw error;
  }
}

/**
 * Escribe un archivo de contenido de forma segura
 * @param content - Contenido a escribir
 * @param segments - Segmentos de ruta del archivo
 */
export async function writeContentFile(content: string, ...segments: string[]): Promise<void> {
  const filePath = resolveContentPath(...segments);
  
  // Crear directorio padre si no existe
  const dirPath = path.dirname(filePath);
  await fs.mkdir(dirPath, { recursive: true });
  
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Verifica si un archivo de contenido existe
 * @param segments - Segmentos de ruta del archivo
 * @returns true si el archivo existe, false en caso contrario
 */
export async function contentFileExists(...segments: string[]): Promise<boolean> {
  try {
    const filePath = resolveContentPath(...segments);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lista archivos en un directorio de contenido
 * @param segments - Segmentos de ruta del directorio
 * @returns Array de nombres de archivos
 */
export async function listContentFiles(...segments: string[]): Promise<string[]> {
  const dirPath = resolveContentPath(...segments);
  try {
    const files = await fs.readdir(dirPath);
    return files.filter(file => !file.startsWith('.'));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Elimina un archivo de contenido de forma segura
 * @param segments - Segmentos de ruta del archivo
 */
export async function deleteContentFile(...segments: string[]): Promise<void> {
  const filePath = resolveContentPath(...segments);
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // Si el archivo no existe, no es un error
  }
}

/**
 * Obtiene información de un archivo de contenido
 * @param segments - Segmentos de ruta del archivo
 * @returns Información del archivo (stats)
 */
export async function getContentFileStats(...segments: string[]) {
  const filePath = resolveContentPath(...segments);
  try {
    return await fs.stat(filePath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const notFoundError = new Error(`Content file not found: ${segments.join('/')}`);
      (notFoundError as any).status = 404;
      throw notFoundError;
    }
    throw error;
  }
}
