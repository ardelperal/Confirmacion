import { promises as fs } from 'fs';
import path from 'path';
import { AuditLogEntry } from '@/types';
import { resolveContentPath } from '@/lib/fsSafe';

const AUDIT_LOG_PATH = resolveContentPath('.audit.log');

// Asegurar que el directorio de contenido existe
async function ensureContentDir() {
  const contentDir = path.dirname(AUDIT_LOG_PATH);
  try {
    await fs.access(contentDir);
  } catch {
    await fs.mkdir(contentDir, { recursive: true });
  }
}

// Registrar una acción en el log de auditoría
export async function logAuditAction(
  user: string,
  action: 'save' | 'publish' | 'unpublish' | 'delete',
  code: string,
  version?: number
): Promise<void> {
  try {
    await ensureContentDir();
    
    const logEntry: AuditLogEntry = {
      ts: new Date().toISOString(),
      user,
      action,
      code,
      version: version || 1
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    // Append al archivo de log
    await fs.appendFile(AUDIT_LOG_PATH, logLine, 'utf8');
  } catch (error) {
    console.error('Error escribiendo log de auditoría:', error);
    // No lanzar error para no interrumpir la operación principal
  }
}

// Leer entradas del log de auditoría
export async function getAuditLog(limit?: number): Promise<AuditLogEntry[]> {
  try {
    await ensureContentDir();
    
    // Verificar si el archivo existe
    try {
      await fs.access(AUDIT_LOG_PATH);
    } catch {
      return []; // Archivo no existe, retornar array vacío
    }

    const content = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    
    const entries: AuditLogEntry[] = [];
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as AuditLogEntry;
        entries.push(entry);
      } catch (error) {
        console.error('Error parseando línea de log:', line, error);
      }
    }
    
    // Ordenar por timestamp descendente (más reciente primero)
    entries.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    
    // Aplicar límite si se especifica
    if (limit && limit > 0) {
      return entries.slice(0, limit);
    }
    
    return entries;
  } catch (error) {
    console.error('Error leyendo log de auditoría:', error);
    return [];
  }
}

// Obtener estadísticas del log de auditoría
export async function getAuditStats(): Promise<{
  totalActions: number;
  actionsByType: Record<string, number>;
  lastActivity: string | null;
}> {
  try {
    const entries = await getAuditLog();
    
    const actionsByType: Record<string, number> = {};
    
    for (const entry of entries) {
      actionsByType[entry.action] = (actionsByType[entry.action] || 0) + 1;
    }
    
    return {
      totalActions: entries.length,
      actionsByType,
      lastActivity: entries.length > 0 ? entries[0].ts : null
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de auditoría:', error);
    return {
      totalActions: 0,
      actionsByType: {},
      lastActivity: null
    };
  }
}
