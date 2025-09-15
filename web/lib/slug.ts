/**
 * Utilidades para validación de slugs
 * Garantiza que los slugs cumplan con el formato seguro: solo letras minúsculas, números y guiones
 */

/**
 * Valida si un string es un slug válido
 * Formato permitido: letras minúsculas, números y guiones (no puede empezar/terminar con guión)
 * @param slug - String a validar
 * @returns true si es un slug válido, false en caso contrario
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }
  
  // Patrón: solo letras minúsculas, números y guiones
  // No puede empezar ni terminar con guión
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

/**
 * Valida un slug y lanza error 400 si no es válido
 * @param slug - String a validar
 * @throws Error con status 400 si el slug no es válido
 */
export function assertValidSlug(slug: string): void {
  if (!isValidSlug(slug)) {
    const error = new Error(`Invalid slug format: '${slug}'. Only lowercase letters, numbers and hyphens are allowed.`);
    (error as any).status = 400;
    throw error;
  }
}

/**
 * Normaliza un string para convertirlo en un slug válido
 * @param input - String a normalizar
 * @returns Slug válido generado a partir del input
 */
export function normalizeToSlug(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres no permitidos
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno solo
    .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio/final
}