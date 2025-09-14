import { NextRequest, NextResponse } from 'next/server';
import { log, createLogContext, createTimer, LogContext } from './logger';

// Re-exportar createLogContext para uso en otros módulos
export { createLogContext };

// Middleware para logging de requests HTTP
export function withLogging(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    const timer = createTimer();
    const context = createLogContext(req);
    const requestId = generateRequestId();
    
    // Log de inicio de request
    log.access('Request started', {
      ...context,
      requestId,
      body: await getRequestBody(req),
    });

    try {
      const response = await handler(req, ...args);
      const responseTime = timer();
      const statusCode = response?.status || 200;

      // Log de respuesta exitosa
      log.access('Request completed', {
        ...context,
        requestId,
        statusCode,
        responseTime,
        success: true,
      });

      return response;
    } catch (error: any) {
      const responseTime = timer();
      
      // Log de error
      log.error('Request failed', {
        ...context,
        requestId,
        responseTime,
        error: error.message,
        stack: error.stack,
        success: false,
      });

      throw error;
    }
  };
}

// Middleware específico para rutas API
export function withApiLogging(handler: Function) {
  return async (req: NextRequest, context: any) => {
    const timer = createTimer();
    const logContext = createLogContext(req);
    const requestId = generateRequestId();
    const route = context?.params ? JSON.stringify(context.params) : 'unknown';
    
    log.http('API Request', {
      ...logContext,
      requestId,
      route,
      params: context?.params,
    });

    try {
      const response = await handler(req, context);
      const responseTime = timer();
      const statusCode = response?.status || 200;

      log.http('API Response', {
        ...logContext,
        requestId,
        route,
        statusCode,
        responseTime,
        success: statusCode < 400,
      });

      return response;
    } catch (error: any) {
      const responseTime = timer();
      
      log.error('API Error', {
        ...logContext,
        requestId,
        route,
        responseTime,
        error: error.message,
        stack: error.stack,
      });

      // Re-throw para que Next.js maneje el error
      throw error;
    }
  };
}

// Función para logging de autenticación
export function logAuthAttempt(success: boolean, context: LogContext & { username?: string }) {
  if (success) {
    log.auth('Authentication successful', {
      ...context,
      success: true,
    });
  } else {
    log.security('Authentication failed', {
      ...context,
      success: false,
    });
  }
}

// Función para logging de acciones administrativas
export function logAdminAction(action: string, resource: string, context: LogContext & { resourceId?: string }) {
  log.admin(`${action} ${resource}`, {
    ...context,
    action,
    resource,
  });
}

// Función para logging de acceso a sesiones
export function logSessionAccess(sessionCode: string, context: LogContext) {
  log.info('Session accessed', {
    ...context,
    sessionCode,
    category: 'session_access',
  });
}

// Función para logging de descargas
export function logDownload(type: 'pdf' | 'docx', sessionCode: string, context: LogContext) {
  log.info('Content downloaded', {
    ...context,
    downloadType: type,
    sessionCode,
    category: 'download',
  });
}

// Función para logging de errores de validación
export function logValidationError(field: string, value: any, context: LogContext) {
  log.warn('Validation error', {
    ...context,
    field,
    value: typeof value === 'string' ? value.substring(0, 100) : value,
    category: 'validation',
  });
}

// Función para logging de cambios de configuración
export function logConfigChange(setting: string, oldValue: any, newValue: any, context: LogContext) {
  log.admin('Configuration changed', {
    ...context,
    setting,
    oldValue,
    newValue,
    category: 'configuration',
  });
}

// Utilidades
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function getRequestBody(req: NextRequest): Promise<any> {
  try {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return null;
    }
    
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await req.clone().json();
      // Filtrar campos sensibles
      return filterSensitiveData(body);
    }
    
    return 'non-json-body';
  } catch {
    return null;
  }
}

function filterSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const filtered = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  for (const field of sensitiveFields) {
    if (field in filtered) {
      filtered[field] = '[FILTERED]';
    }
  }
  
  return filtered;
}

// Función para crear métricas de uso
export function logUsageMetrics(metrics: {
  activeUsers?: number;
  sessionsViewed?: number;
  downloadsCount?: number;
  adminActions?: number;
}) {
  log.info('Usage metrics', {
    ...metrics,
    category: 'metrics',
    timestamp: new Date().toISOString(),
  });
}