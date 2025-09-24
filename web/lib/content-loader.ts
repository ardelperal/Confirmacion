import path from 'path';
import yaml from 'js-yaml';
import { readContentFile, listContentFiles, contentFileExists } from './fsSafe';
import { assertValidSlug } from './slug';
import { 
  SessionContent, 
  ModuleContent, 
  ModuleInfo, 
  CourseConfig,
  SessionFrontMatter 
} from '@/types';
import { 
  parseMarkdown, 
  validateSessionFrontMatter, 
  extractSessionCode,
  extractModuleCode 
} from './markdown-parser';
import { getVisibilityMode } from '@/lib/auth';

// Tipos para las nuevas funciones
export interface SessionSummary {
  code: string;
  title: string;
  module: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  updated: string; // editedAt || updated_at
  publishedAt?: string | null;
  duration: number;
  bible: string[];
  cic: string[];
}

export interface VisibilityOptions {
  visibility: 'public' | 'admin';
}

// Rutas relativas desde data/content
const SESSIONS_SUBDIR = 'sessions';
const MODULES_CONFIG_FILE = 'modules.yml';

/**
 * Cache para mejorar el rendimiento
 */
const cache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  data: any;
  timestamp: number;
}

/**
 * Obtiene datos del cache si están disponibles y no han expirado
 */
function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry;
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

/**
 * Guarda datos en el cache
 */
function setCache(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Carga la configuración de módulos desde modules.yml
 */
export async function loadModulesConfig(): Promise<CourseConfig> {
  const cacheKey = 'modules-config';
  const cached = getFromCache<CourseConfig>(cacheKey);
  if (cached) return cached;

  try {
    const configContent = await readContentFile(MODULES_CONFIG_FILE);
    const config = yaml.load(configContent) as CourseConfig;
    
    setCache(cacheKey, config);
    return config;
  } catch (error) {
    console.error('Error loading modules config:', error);
    throw new Error('No se pudo cargar la configuración de módulos');
  }
}

/**
 * Obtiene información de un módulo específico
 */
export async function getModuleInfo(moduleCode: string): Promise<ModuleInfo | null> {
  const config = await loadModulesConfig();
  return config.modules.find(m => m.code.toLowerCase() === moduleCode.toLowerCase()) || null;
}

/**
 * Verifica si una sesión es visible según las políticas de visibilidad
 */
function isSessionVisible(session: SessionContent, visibility: 'public' | 'admin' = 'public'): boolean {
  // Si es vista admin, mostrar todas
  if (visibility === 'admin') {
    return true;
  }
  
  // SEGURIDAD: El modo público SIEMPRE debe mostrar solo contenido published
  // No importa el visibilityMode configurado, nunca exponer contenido edited públicamente
  return session.frontMatter.status === 'published';
}

/**
 * Obtiene una sesión específica por su código
 * @param sessionCode Código de la sesión (ej: "A1")
 * @param options Opciones de visibilidad
 * @returns Contenido de la sesión o null si no existe
 */
export async function getSession(sessionCode: string, options: VisibilityOptions = { visibility: 'public' }): Promise<SessionContent | null> {
  // Validar slug del código de sesión
  try {
    assertValidSlug(sessionCode.toLowerCase());
  } catch (error) {
    console.warn(`Código de sesión inválido: ${sessionCode}`);
    return null;
  }

  const normalizedCode = sessionCode.toUpperCase();
  const cacheKey = `session-${normalizedCode}`;
  
  const cached = getFromCache<SessionContent>(cacheKey);
  if (cached && options.visibility === 'public') return cached;

  try {
    // Buscar archivo de sesión usando helpers seguros
    const possibleFilenames = [
      `${normalizedCode}.md`,
      `session-${normalizedCode}.md`,
      `${normalizedCode.toLowerCase()}.md`,
      `session-${normalizedCode.toLowerCase()}.md`
    ];

    let sessionFilePath: string | null = null;
    for (const filename of possibleFilenames) {
      const filePath = path.join(SESSIONS_SUBDIR, filename);
      if (await contentFileExists(filePath)) {
        sessionFilePath = filePath;
        break;
      }
    }

    if (!sessionFilePath) {
      console.warn(`Sesión ${normalizedCode} no encontrada`);
      return null;
    }

    // Leer y parsear el archivo usando helper seguro
    const fileContent = await readContentFile(sessionFilePath);
    const parsed = await parseMarkdown(fileContent);

    // Validar front-matter
    if (!validateSessionFrontMatter(parsed.frontMatter)) {
      console.error(`Front-matter inválido en sesión ${normalizedCode}`);
      return null;
    }

    // Asegurar que el código coincida
    if (parsed.frontMatter.code !== normalizedCode) {
      console.warn(`Código en front-matter (${parsed.frontMatter.code}) no coincide con archivo (${normalizedCode})`);
    }

    const sessionContent: SessionContent = {
      frontMatter: parsed.frontMatter as SessionFrontMatter,
      content: parsed.content,
      htmlContent: parsed.htmlContent
    };

    // Verificar visibilidad según las opciones
    if (!isSessionVisible(sessionContent, options.visibility)) {
      return null;
    }

    setCache(cacheKey, sessionContent);
    return sessionContent;
  } catch (error) {
    console.error(`Error loading session ${normalizedCode}:`, error);
    return null;
  }
}

/**
 * Obtiene todas las sesiones de un módulo
 * @param moduleCode Código del módulo (ej: "A")
 * @returns Contenido completo del módulo con todas sus sesiones
 */
export async function getModule(moduleCode: string, options: VisibilityOptions = { visibility: 'public' }): Promise<ModuleContent | null> {
  // Validar slug del código de módulo
  try {
    assertValidSlug(moduleCode.toLowerCase());
  } catch (error) {
    console.warn(`Código de módulo inválido: ${moduleCode}`);
    return null;
  }

  const normalizedCode = moduleCode.toUpperCase();
  const cacheKey = `module-${normalizedCode}-${options.visibility}`;
  
  const cached = getFromCache<ModuleContent>(cacheKey);
  if (cached) return cached;

  try {
    // Obtener información del módulo
    const moduleInfo = await getModuleInfo(normalizedCode);
    if (!moduleInfo) {
      console.error(`Módulo ${normalizedCode} no encontrado en configuración`);
      return null;
    }

    // Cargar todas las sesiones del módulo
    const sessions: SessionContent[] = [];
    
    for (const sessionInfo of moduleInfo.sessions) {
      const session = await getSession(sessionInfo.code, options);
      if (session) {
        sessions.push(session);
      } else {
        console.warn(`Sesión ${sessionInfo.code} del módulo ${normalizedCode} no pudo ser cargada`);
      }
    }

    const moduleContent: ModuleContent = {
      info: moduleInfo,
      sessions
    };

    setCache(cacheKey, moduleContent);
    return moduleContent;
  } catch (error) {
    console.error(`Error loading module ${normalizedCode}:`, error);
    return null;
  }
}

/**
 * Obtiene la lista de todas las sesiones disponibles con información completa
 * @param options Opciones de visibilidad
 * @returns Array de resúmenes de sesiones
 */
export async function getAllSessions(options: VisibilityOptions = { visibility: 'public' }): Promise<SessionSummary[]> {
  const cacheKey = `all-sessions-${options.visibility}`;
  const cached = getFromCache<SessionSummary[]>(cacheKey);
  if (cached) return cached;

  try {
    // Listar archivos usando helper seguro
    const files = await listContentFiles(SESSIONS_SUBDIR)
      .then(files => files.filter(file => file.endsWith('.md')))
      .catch(() => []); // Si no existe el directorio, devolver array vacío

    const sessionCodes = files
      .map(file => extractSessionCode(file))
      .filter(code => code !== null) as string[];

    const uniqueCodes = Array.from(new Set(sessionCodes)).sort();
    const sessions: SessionSummary[] = [];
    
    for (const code of uniqueCodes) {
      const session = await getSession(code, { visibility: 'admin' }); // Cargar sin filtro para obtener datos
      if (session) {
        // Aplicar filtro de visibilidad
        if (isSessionVisible(session, options.visibility)) {
          const summary: SessionSummary = {
            code: session.frontMatter.code,
            title: session.frontMatter.title,
            module: session.frontMatter.module,
            status: session.frontMatter.status || 'draft',
            version: session.frontMatter.version || 1,
            updated: session.frontMatter.editedAt || session.frontMatter.updated_at || session.frontMatter.created_at || new Date().toISOString(),
            publishedAt: session.frontMatter.publishedAt || null,
            duration: session.frontMatter.duration,
            bible: session.frontMatter.biblical_references || [],
            cic: session.frontMatter.catechism_references || []
          };
          sessions.push(summary);
        }
      }
    }
    
    setCache(cacheKey, sessions);
    return sessions;
  } catch (error) {
    console.error('Error getting all sessions:', error);
    return [];
  }
}

/**
 * Obtiene la lista de todos los módulos disponibles
 */
export async function getAllModules(): Promise<string[]> {
  try {
    const config = await loadModulesConfig();
    return config.modules.map(m => m.code).sort();
  } catch (error) {
    console.error('Error getting all modules:', error);
    return [];
  }
}

/**
 * Genera el índice público de sesiones para /api/index.json
 */
export async function buildIndex(options: VisibilityOptions = { visibility: 'public' }): Promise<SessionSummary[]> {
  return await getAllSessions(options);
}

/**
 * Verifica si una sesión existe
 */
export async function sessionExists(sessionCode: string): Promise<boolean> {
  const session = await getSession(sessionCode, { visibility: 'admin' });
  return session !== null;
}

/**
 * Verifica si un módulo existe
 */
export async function moduleExists(moduleCode: string): Promise<boolean> {
  const moduleData = await getModule(moduleCode);
  return moduleData !== null;
}

/**
 * Limpia el cache (útil para desarrollo)
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Obtiene estadísticas del contenido
 */
export async function getContentStats() {
  try {
    const config = await loadModulesConfig();
    const totalSessions = config.modules.reduce((acc, module) => acc + module.sessions.length, 0);
    const totalModules = config.modules.length;
    
    return {
      totalSessions,
      totalModules,
      targetAge: config.settings.target_age,
      courseName: config.settings.course_name
    };
  } catch (error) {
    console.error('Error getting content stats:', error);
    return {
      totalSessions: 0,
      totalModules: 0,
      targetAge: '12-13',
      courseName: 'Confirmación'
    };
  }
}
