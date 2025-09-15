import { parse as yamlParse } from 'yaml';

// Configuración segura para YAML
const SAFE_YAML_OPTIONS = {
  // Rechazar anchors y aliases (&ref, *ref)
  merge: false,
  // No permitir tipos personalizados
  customTags: [],
  // Limitar profundidad de anidamiento
  maxAliasCount: 0,
  // Modo estricto
  strict: true,
  // No permitir documentos múltiples
  logLevel: 'error' as const
};

// Límites de seguridad
const MAX_YAML_SIZE = 50 * 1024; // 50KB
const MAX_FRONTMATTER_SIZE = 10 * 1024; // 10KB
const MAX_NESTING_DEPTH = 10;

/**
 * Valida el tamaño del contenido YAML
 */
export function validateYamlSize(content: string): void {
  if (content.length > MAX_YAML_SIZE) {
    throw new Error(`YAML content exceeds maximum size limit (${MAX_YAML_SIZE} bytes)`);
  }
}

/**
 * Valida el tamaño del frontmatter
 */
export function validateFrontmatterSize(content: string): void {
  if (content.length > MAX_FRONTMATTER_SIZE) {
    throw new Error(`Frontmatter exceeds maximum size limit (${MAX_FRONTMATTER_SIZE} bytes)`);
  }
}

/**
 * Verifica la profundidad de anidamiento de un objeto
 */
function checkNestingDepth(obj: any, currentDepth = 0): void {
  if (currentDepth > MAX_NESTING_DEPTH) {
    throw new Error(`YAML nesting depth exceeds maximum limit (${MAX_NESTING_DEPTH})`);
  }

  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        checkNestingDepth(item, currentDepth + 1);
      }
    } else {
      for (const value of Object.values(obj)) {
        checkNestingDepth(value, currentDepth + 1);
      }
    }
  }
}

/**
 * Sanitiza valores del YAML para prevenir inyecciones
 */
function sanitizeYamlValue(value: any): any {
  if (typeof value === 'string') {
    // Remover caracteres de control peligrosos
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeYamlValue);
  }
  
  if (value && typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      // Sanitizar también las claves
      const cleanKey = typeof key === 'string' 
        ? key.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        : key;
      sanitized[cleanKey] = sanitizeYamlValue(val);
    }
    return sanitized;
  }
  
  return value;
}

/**
 * Parsea YAML de forma segura
 */
export function parseYamlSafe(content: string): any {
  // Validar tamaño
  validateYamlSize(content);
  
  // Verificar que no contenga anchors o aliases
  if (content.includes('&') || content.includes('*')) {
    throw new Error('YAML anchors and aliases are not allowed for security reasons');
  }
  
  // Verificar que no contenga tags personalizados
  if (content.includes('!!')) {
    throw new Error('Custom YAML tags are not allowed for security reasons');
  }
  
  try {
    // Parsear con configuración segura
    const parsed = yamlParse(content, SAFE_YAML_OPTIONS);
    
    // Verificar profundidad de anidamiento
    checkNestingDepth(parsed);
    
    // Sanitizar valores
    return sanitizeYamlValue(parsed);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid YAML: ${error.message}`);
    }
    throw new Error('Invalid YAML format');
  }
}

/**
 * Extrae y parsea frontmatter de un documento Markdown
 */
export function parseFrontmatter(content: string): { frontmatter: any; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const [, yamlContent, body] = match;
  
  // Validar tamaño del frontmatter
  validateFrontmatterSize(yamlContent);
  
  try {
    const frontmatter = parseYamlSafe(yamlContent);
    return { frontmatter, body };
  } catch (error) {
    throw new Error(`Error parsing frontmatter: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Valida que el frontmatter tenga la estructura esperada para sesiones
 */
export function validateSessionFrontmatter(frontmatter: any): void {
  if (!frontmatter || typeof frontmatter !== 'object') {
    throw new Error('Frontmatter must be an object');
  }
  
  // Validar campos requeridos
  const requiredFields = ['code', 'title'];
  for (const field of requiredFields) {
    if (!(field in frontmatter)) {
      throw new Error(`Missing required field in frontmatter: ${field}`);
    }
    if (typeof frontmatter[field] !== 'string') {
      throw new Error(`Field '${field}' must be a string`);
    }
  }
  
  // Validar código de sesión
  if (!/^[A-F][1-4]$/.test(frontmatter.code)) {
    throw new Error('Invalid session code format. Must be A1-A4, B1-B4, etc.');
  }
  
  // Validar longitud del título
  if (frontmatter.title.length > 200) {
    throw new Error('Session title is too long (max 200 characters)');
  }
}