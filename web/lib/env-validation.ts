/**
 * Validación de variables de entorno críticas
 * Se ejecuta al arranque de la aplicación para asegurar configuración correcta
 */

interface RequiredEnvVars {
  JWT_SECRET: string;
  ADMIN_PASSWORD_HASH: string;
  GOTENBERG_URL: string;
}

interface OptionalEnvVars {
  NODE_ENV?: string;
  PORT?: string;
  HOSTNAME?: string;
  BASE_URL?: string;
  READ_ONLY?: string;
  LOG_LEVEL?: string;
  NEXT_TELEMETRY_DISABLED?: string;
  SECURE_HEADERS?: string;
}

/**
 * Valida que todas las variables de entorno críticas estén configuradas
 * @throws Error si falta alguna variable crítica
 */
export function validateEnvironmentVariables(): void {
  const errors: string[] = [];

  // Variables críticas que DEBEN estar configuradas
  const requiredVars: (keyof RequiredEnvVars)[] = [
    'JWT_SECRET',
    'ADMIN_PASSWORD_HASH', 
    'GOTENBERG_URL'
  ];

  // Verificar variables críticas
  for (const varName of requiredVars) {
    const value = process.env[varName];
    
    if (!value || value.trim() === '') {
      errors.push(`${varName} no está configurada o está vacía`);
      continue;
    }

    // Validaciones específicas por variable
    switch (varName) {
      case 'JWT_SECRET':
        if (value.length < 32) {
          errors.push(`${varName} debe tener al menos 32 caracteres para ser segura`);
        }
        if (value === 'cambia_esta_clave_larga_aleatoria_minimo_32_caracteres') {
          errors.push(`${varName} debe cambiarse del valor por defecto`);
        }
        break;

      case 'ADMIN_PASSWORD_HASH':
        if (!value.startsWith('$2b$') && !value.startsWith('$2a$') && !value.startsWith('$2y$')) {
          errors.push(`${varName} debe ser un hash bcrypt válido (debe empezar con $2b$, $2a$ o $2y$)`);
        }
        if (value === '$2b$12$reemplazaPorHashBCrypt') {
          errors.push(`${varName} debe cambiarse del valor por defecto. Usa: npm run hash:admin`);
        }
        break;

      case 'GOTENBERG_URL':
        try {
          new URL(value);
        } catch {
          errors.push(`${varName} debe ser una URL válida (ej: http://gotenberg:3000)`);
        }
        break;
    }
  }

  // Validaciones adicionales para variables opcionales
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv && !['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push('NODE_ENV debe ser "development", "production" o "test"');
  }

  const port = process.env.PORT;
  if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
    errors.push('PORT debe ser un número válido entre 1 y 65535');
  }

  const baseUrl = process.env.BASE_URL;
  if (baseUrl) {
    try {
      new URL(baseUrl);
    } catch {
      errors.push('BASE_URL debe ser una URL válida si está configurada');
    }
  }

  // Si hay errores, lanzar excepción con todos los problemas
  if (errors.length > 0) {
    const errorMessage = [
      '❌ ERROR: Variables de entorno críticas no configuradas correctamente:',
      '',
      ...errors.map(error => `  • ${error}`),
      '',
      '💡 Soluciones:',
      '  • Copia web/.env.example a .env y configura las variables',
      '  • Para generar ADMIN_PASSWORD_HASH: npm run hash:admin',
      '  • Para JWT_SECRET usa una clave aleatoria de al menos 32 caracteres',
      '  • Para GOTENBERG_URL usa: http://gotenberg:3000 (Docker) o http://localhost:3000 (local)',
      ''
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log de confirmación en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Variables de entorno validadas correctamente');
  }
}

/**
 * Obtiene la configuración validada de la aplicación
 */
export function getValidatedConfig() {
  validateEnvironmentVariables();
  
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3001,
    hostname: process.env.HOSTNAME || '0.0.0.0',
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
    jwtSecret: process.env.JWT_SECRET!,
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH!,
    gotenbergUrl: process.env.GOTENBERG_URL!,
    readOnly: process.env.READ_ONLY === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    telemetryDisabled: process.env.NEXT_TELEMETRY_DISABLED === '1',
    secureHeaders: process.env.SECURE_HEADERS !== 'false'
  };
}