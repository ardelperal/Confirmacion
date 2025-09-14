import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Configuración de niveles personalizados
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

// Agregar colores a winston
winston.addColors(customLevels.colors);

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  })
);

// Formato para consola (desarrollo)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Directorio de logs (en data para incluir en backups)
const logsDir = path.join(process.cwd(), '..', 'data', 'logs');

// Crear directorio de logs si no existe
try {
  const fs = require('fs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating logs directory:', error);
}

// Configuración de transports
const transports: winston.transport[] = [];

// Transport para errores (archivo separado)
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  })
);

// Transport para todos los logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
  })
);

// Transport para logs de acceso HTTP
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
  })
);

// Transport para consola (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  );
}

// Crear logger principal
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

// Interfaces para tipado
export interface LogContext {
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  error?: Error;
  [key: string]: any;
}

// Funciones de logging con contexto
export const log = {
  error: (message: string, context?: LogContext) => {
    logger.error(message, context);
  },
  
  warn: (message: string, context?: LogContext) => {
    logger.warn(message, context);
  },
  
  info: (message: string, context?: LogContext) => {
    logger.info(message, context);
  },
  
  http: (message: string, context?: LogContext) => {
    logger.http(message, context);
  },
  
  debug: (message: string, context?: LogContext) => {
    logger.debug(message, context);
  },
  
  // Funciones especializadas
  auth: (message: string, context?: LogContext) => {
    logger.info(`[AUTH] ${message}`, { ...context, category: 'authentication' });
  },
  
  admin: (message: string, context?: LogContext) => {
    logger.info(`[ADMIN] ${message}`, { ...context, category: 'administration' });
  },
  
  access: (message: string, context?: LogContext) => {
    logger.http(`[ACCESS] ${message}`, { ...context, category: 'access' });
  },
  
  security: (message: string, context?: LogContext) => {
    logger.warn(`[SECURITY] ${message}`, { ...context, category: 'security' });
  },
};

// Función para crear contexto desde Request
export const createLogContext = (req: any): LogContext => {
  return {
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers?.['user-agent'],
    method: req.method,
    url: req.url,
    sessionId: req.headers?.['x-session-id'] || 'anonymous',
  };
};

// Función para medir tiempo de respuesta
export const createTimer = () => {
  const start = Date.now();
  return () => Date.now() - start;
};

export default logger;