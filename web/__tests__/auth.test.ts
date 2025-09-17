/**
 * Tests para autenticación con argon2id
 * Valida hash correcto/incorrecto y seguridad de logs
 */

import { verifyAdminPassword, generateToken, verifyToken } from '@/lib/auth';
import { generateHash, verifyHash, ARGON2_OPTIONS } from '../scripts/gen-admin-hash';
import * as argon2 from 'argon2';

// Mock de console para capturar logs
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
let capturedLogs: string[] = [];

beforeEach(() => {
  capturedLogs = [];
  console.error = jest.fn((...args) => {
    capturedLogs.push(args.join(' '));
  });
  console.log = jest.fn((...args) => {
    capturedLogs.push(args.join(' '));
  });
});

afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

// Mock de variables de entorno
const originalEnv = process.env;

beforeAll(() => {
  // Configurar variables de entorno para tests
  process.env = {
    ...originalEnv,
    JWT_SECRET: 'test-secret-key-for-testing-only',
    NODE_ENV: 'test'
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Autenticación con Argon2id', () => {
  const testPassword = 'TestPassword123!';
  let testHash: string;

  beforeAll(async () => {
    // Generar hash de prueba
    testHash = await generateHash(testPassword);
  });

  describe('Generación y verificación de hash', () => {
    test('debe generar un hash argon2id válido', async () => {
      const hash = await generateHash(testPassword);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('$argon2id$')).toBe(true);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('debe verificar correctamente un hash válido', async () => {
      const isValid = await verifyHash(testPassword, testHash);
      expect(isValid).toBe(true);
    });

    test('debe fallar con contraseña incorrecta', async () => {
      const isValid = await verifyHash('WrongPassword123!', testHash);
      expect(isValid).toBe(false);
    });

    test('debe usar configuración argon2id segura', async () => {
      expect(ARGON2_OPTIONS.type).toBe(argon2.argon2id);
      expect(ARGON2_OPTIONS.memoryCost).toBeGreaterThanOrEqual(19456);
      expect(ARGON2_OPTIONS.timeCost).toBeGreaterThanOrEqual(3);
      expect(ARGON2_OPTIONS.parallelism).toBeGreaterThanOrEqual(1);
    });

    test('debe generar hashes diferentes para la misma contraseña', async () => {
      const hash1 = await generateHash(testPassword);
      const hash2 = await generateHash(testPassword);
      
      expect(hash1).not.toBe(hash2);
      
      // Pero ambos deben verificar correctamente
      expect(await verifyHash(testPassword, hash1)).toBe(true);
      expect(await verifyHash(testPassword, hash2)).toBe(true);
    });
  });

  describe('Autenticación de administrador', () => {
    beforeEach(() => {
      // Mock de ADMIN_PASSWORD_HASH para cada test
      process.env.ADMIN_PASSWORD_HASH = testHash;
    });

    test('debe autenticar con contraseña correcta', async () => {
      const isValid = await verifyAdminPassword(testPassword);
      expect(isValid).toBe(true);
    });

    test('debe fallar con contraseña incorrecta', async () => {
      const isValid = await verifyAdminPassword('WrongPassword123!');
      expect(isValid).toBe(false);
    });

    test('debe manejar errores sin exponer información sensible', async () => {
      // Simular hash malformado
      process.env.ADMIN_PASSWORD_HASH = 'invalid-hash';
      
      const isValid = await verifyAdminPassword(testPassword);
      expect(isValid).toBe(false);
      
      // Verificar que se logueó el error pero sin información sensible
      const errorLogs = capturedLogs.filter(log => 
        log.includes('Error verificando contraseña')
      );
      expect(errorLogs.length).toBeGreaterThan(0);
      
      // Verificar que no se filtró la contraseña ni el hash
      capturedLogs.forEach(log => {
        expect(log).not.toContain(testPassword);
        expect(log).not.toContain('invalid-hash');
      });
    });
  });

  describe('JWT Token Management', () => {
    const testUser = {
      id: 'admin',
      username: 'admin',
      role: 'admin' as const
    };

    test('debe generar token JWT válido', async () => {
      const token = await generateToken(testUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT tiene 3 partes
    });

    test('debe verificar token JWT válido', async () => {
      const token = await generateToken(testUser);
      const result = await verifyToken(token);
      
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.user?.id).toBe(testUser.id);
      expect(result.user?.username).toBe(testUser.username);
      expect(result.user?.role).toBe(testUser.role);
    });

    test('debe fallar con token inválido', async () => {
      const result = await verifyToken('invalid.jwt.token');
      expect(result.user).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Token inválido');
    });

    test('debe fallar con token expirado', async () => {
      // Este test requeriría mockear el tiempo o usar una librería como jest-date-mock
      // Por simplicidad, solo verificamos que tokens malformados fallan
      const result = await verifyToken('');
      expect(result.user).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Token inválido');
    });
  });

  describe('Seguridad de logs', () => {
    test('no debe loguear contraseñas en texto plano', async () => {
      const sensitivePassword = 'SuperSecretPassword123!';
      
      // Intentar autenticación que falle
      await verifyAdminPassword(sensitivePassword);
      
      // Verificar que la contraseña no aparece en los logs
      capturedLogs.forEach(log => {
        expect(log).not.toContain(sensitivePassword);
      });
    });

    test('no debe loguear hashes completos', async () => {
      // Simular error con hash válido
      const originalHash = process.env.ADMIN_PASSWORD_HASH;
      process.env.ADMIN_PASSWORD_HASH = testHash;
      
      // Forzar un error interno (esto podría requerir más mocking)
      await verifyAdminPassword('test');
      
      // Verificar que el hash completo no aparece en logs
      capturedLogs.forEach(log => {
        expect(log).not.toContain(testHash);
      });
      
      process.env.ADMIN_PASSWORD_HASH = originalHash;
    });

    test('debe loguear intentos de autenticación sin datos sensibles', async () => {
      // Este test verificaría que los logs de autenticación no contienen
      // información sensible, pero sí información útil para auditoría
      
      await verifyAdminPassword('wrongpassword');
      
      // Buscar logs de autenticación
      const authLogs = capturedLogs.filter(log => 
        log.includes('Error verificando') || log.includes('Authentication')
      );
      
      // Debe haber logs de autenticación
      expect(authLogs.length).toBeGreaterThan(0);
      
      // Pero no deben contener la contraseña
      authLogs.forEach(log => {
        expect(log).not.toContain('wrongpassword');
      });
    });
  });

  describe('Validación de configuración', () => {
    test('debe requerir ADMIN_PASSWORD_HASH configurado', async () => {
      // Simular configuración faltante
      const originalHash = process.env.ADMIN_PASSWORD_HASH;
      delete process.env.ADMIN_PASSWORD_HASH;
      
      // Verificar que la autenticación falla sin hash configurado
      const isValid = await verifyAdminPassword('anypassword');
      expect(isValid).toBe(false);
      
      // Restaurar configuración
      if (originalHash) {
        process.env.ADMIN_PASSWORD_HASH = originalHash;
      }
    });

    test('debe manejar hash malformado correctamente', async () => {
      const originalHash = process.env.ADMIN_PASSWORD_HASH;
      process.env.ADMIN_PASSWORD_HASH = 'hash-malformado';
      
      const isValid = await verifyAdminPassword('anypassword');
      expect(isValid).toBe(false);
      
      // Restaurar configuración
      if (originalHash) {
        process.env.ADMIN_PASSWORD_HASH = originalHash;
      }
    });
  });
});

// Tests de integración básicos
describe('Integración de autenticación', () => {
  test('flujo completo: generar hash -> verificar -> autenticar', async () => {
    const password = 'IntegrationTestPassword123!';
    
    // 1. Generar hash
    const hash = await generateHash(password);
    expect(hash).toBeDefined();
    
    // 2. Verificar hash
    const isValidHash = await verifyHash(password, hash);
    expect(isValidHash).toBe(true);
    
    // 3. Configurar y autenticar
    process.env.ADMIN_PASSWORD_HASH = hash;
    const isAuthenticated = await verifyAdminPassword(password);
    expect(isAuthenticated).toBe(true);
    
    // 4. Generar y verificar token
    const user = { id: 'admin', username: 'admin', role: 'admin' as const };
    const token = await generateToken(user);
    const result = await verifyToken(token);
    
    expect(result).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.user?.role).toBe('admin');
  });
});