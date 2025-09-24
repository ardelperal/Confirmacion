/**
 * Tests para autenticación con argon2id y JWT
 */

import { verifyAdminPassword, generateToken, verifyToken } from '@/lib/auth';
import { generateHash, verifyHash, ARGON2_OPTIONS } from '../scripts/gen-admin-hash';
import * as argon2 from 'argon2';

// Captura de logs
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
let capturedLogs: string[] = [];

beforeEach(() => {
  capturedLogs = [];
  console.error = jest.fn((...args) => { capturedLogs.push(args.join(' ')); });
  console.log = jest.fn((...args) => { capturedLogs.push(args.join(' ')); });
});

afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

// Mock de variables de entorno
const originalEnv = process.env;

beforeAll(() => {
  process.env = {
    ...originalEnv,
    JWT_SECRET: 'test-secret-key-for-testing-only',
    NODE_ENV: 'test'
  } as any;
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Autenticación con Argon2id', () => {
  const testPassword = 'TestPassword123!';
  let testHash: string;

  beforeAll(async () => {
    testHash = await generateHash(testPassword);
  });

  describe('Generación y verificación de hash', () => {
    test('genera un hash argon2id válido', async () => {
      const hash = await generateHash(testPassword);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('$argon2id$')).toBe(true);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('verifica correctamente un hash válido', async () => {
      const isValid = await verifyHash(testPassword, testHash);
      expect(isValid).toBe(true);
    });

    test('falla con contraseña incorrecta', async () => {
      const isValid = await verifyHash('WrongPassword123!', testHash);
      expect(isValid).toBe(false);
    });

    test('usa configuración argon2id segura', () => {
      expect(ARGON2_OPTIONS.type).toBe(argon2.argon2id);
      expect(ARGON2_OPTIONS.memoryCost).toBeGreaterThanOrEqual(19456);
      expect(ARGON2_OPTIONS.timeCost).toBeGreaterThanOrEqual(3);
      expect(ARGON2_OPTIONS.parallelism).toBeGreaterThanOrEqual(1);
    });

    test('genera hashes diferentes para misma contraseña', async () => {
      const hash1 = await generateHash(testPassword);
      const hash2 = await generateHash(testPassword);
      expect(hash1).not.toBe(hash2);
      expect(await verifyHash(testPassword, hash1)).toBe(true);
      expect(await verifyHash(testPassword, hash2)).toBe(true);
    });
  });

  describe('Autenticación de administrador', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD_HASH = testHash;
    });

    test('autentica con contraseña correcta', async () => {
      const isValid = await verifyAdminPassword(testPassword);
      expect(isValid).toBe(true);
    });

    test('falla con contraseña incorrecta', async () => {
      const isValid = await verifyAdminPassword('WrongPassword123!');
      expect(isValid).toBe(false);
    });

    test('maneja errores sin exponer datos sensibles', async () => {
      process.env.ADMIN_PASSWORD_HASH = 'invalid-hash';
      const isValid = await verifyAdminPassword(testPassword);
      expect(isValid).toBe(false);
      const errorLogs = capturedLogs.filter(l => l.includes('Error verificando'));
      expect(errorLogs.length).toBeGreaterThan(0);
      capturedLogs.forEach(log => {
        expect(log).not.toContain(testPassword);
        expect(log).not.toContain('invalid-hash');
      });
    });
  });

  describe('JWT Token Management', () => {
    const testUser = { id: 'admin', username: 'admin', role: 'admin' as const };

    test('genera token JWT válido', async () => {
      const token = await generateToken(testUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    test('verifica token JWT válido', async () => {
      const token = await generateToken(testUser);
      const result = await verifyToken(token);
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.user?.id).toBe(testUser.id);
      expect(result.user?.username).toBe(testUser.username);
      expect(result.user?.role).toBe(testUser.role);
    });

    test('falla con token inválido', async () => {
      const result = await verifyToken('invalid.jwt.token');
      expect(result.user).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Token inválido');
    });

    test('falla con token malformado', async () => {
      const result = await verifyToken('');
      expect(result.user).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Token inválido');
    });
  });

  describe('Validación de configuración', () => {
    test('requiere ADMIN_PASSWORD_HASH configurado', async () => {
      const originalHash = process.env.ADMIN_PASSWORD_HASH;
      // @ts-ignore
      delete process.env.ADMIN_PASSWORD_HASH;
      const isValid = await verifyAdminPassword('anypassword');
      expect(isValid).toBe(false);
      if (originalHash) process.env.ADMIN_PASSWORD_HASH = originalHash;
    });

    test('maneja hash malformado', async () => {
      const originalHash = process.env.ADMIN_PASSWORD_HASH;
      process.env.ADMIN_PASSWORD_HASH = 'hash-malformado';
      const isValid = await verifyAdminPassword('anypassword');
      expect(isValid).toBe(false);
      if (originalHash) process.env.ADMIN_PASSWORD_HASH = originalHash;
    });
  });
});

describe('Integración de autenticación', () => {
  test('flujo completo', async () => {
    const password = 'IntegrationTestPassword123!';
    const hash = await generateHash(password);
    expect(hash).toBeDefined();
    const isValidHash = await verifyHash(password, hash);
    expect(isValidHash).toBe(true);
    process.env.ADMIN_PASSWORD_HASH = hash;
    const isAuthenticated = await verifyAdminPassword(password);
    expect(isAuthenticated).toBe(true);
    const user = { id: 'admin', username: 'admin', role: 'admin' as const };
    const token = await generateToken(user);
    const result = await verifyToken(token);
    expect(result.user?.role).toBe('admin');
  });
});

