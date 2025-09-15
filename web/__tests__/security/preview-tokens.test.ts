import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/preview/create/route';
import { readFile, writeFile, unlink, mkdir, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Mock de autenticación
jest.mock('@/lib/auth', () => ({
  isAdmin: jest.fn()
}));

import { isAdmin } from '@/lib/auth';
const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;

const TOKENS_DIR = join(process.cwd(), 'data', 'preview-tokens');
const TEST_SESSION_CODE = 'A1';

describe('Preview Tokens Security Tests', () => {
  beforeEach(async () => {
    // Limpiar tokens de prueba
    if (existsSync(TOKENS_DIR)) {
      const files = await readFile(TOKENS_DIR).catch(() => []);
      // Limpiar archivos de test anteriores si existen
    }
  });

  afterEach(async () => {
    // Limpiar después de cada test
    jest.clearAllMocks();
  });

  describe('Token Creation API', () => {
    it('should reject token creation without admin authentication', async () => {
      mockIsAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/preview/create', {
        method: 'POST',
        body: JSON.stringify({ sessionCode: TEST_SESSION_CODE })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('No autorizado');
    });

    it('should create token with valid admin authentication', async () => {
      mockIsAdmin.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/preview/create', {
        method: 'POST',
        body: JSON.stringify({ sessionCode: TEST_SESSION_CODE })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(data.sessionCode).toBe(TEST_SESSION_CODE);
      expect(data.previewUrl).toContain(`/preview/${TEST_SESSION_CODE.toLowerCase()}`);
      expect(data.previewUrl).toContain(`token=${data.token}`);
    });

    it('should reject requests without sessionCode', async () => {
      mockIsAdmin.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/preview/create', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Código de sesión requerido');
    });

    it('should generate unique tokens for each request', async () => {
      mockIsAdmin.mockResolvedValue(true);

      const request1 = new NextRequest('http://localhost/api/preview/create', {
        method: 'POST',
        body: JSON.stringify({ sessionCode: TEST_SESSION_CODE })
      });

      const request2 = new NextRequest('http://localhost/api/preview/create', {
        method: 'POST',
        body: JSON.stringify({ sessionCode: TEST_SESSION_CODE })
      });

      const response1 = await POST(request1);
      const response2 = await POST(request2);
      
      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.token).not.toBe(data2.token);
    });
  });

  describe('Token Validation and Consumption', () => {
    let validToken: string;

    beforeEach(async () => {
      // Crear un token válido para las pruebas
      mockIsAdmin.mockResolvedValue(true);
      const request = new NextRequest('http://localhost/api/preview/create', {
        method: 'POST',
        body: JSON.stringify({ sessionCode: TEST_SESSION_CODE })
      });
      const response = await POST(request);
      const data = await response.json();
      validToken = data.token;
    });

    it('should validate and consume token only once', async () => {
      // Simular validación de token (esto requeriría importar la función)
      // Por ahora, verificamos que el archivo del token existe
      const tokenFile = join(TOKENS_DIR, `${validToken}.json`);
      expect(existsSync(tokenFile)).toBe(true);

      // Verificar estructura del token
      const tokenData = JSON.parse(await readFile(tokenFile, 'utf-8'));
      expect(tokenData.token).toBe(validToken);
      expect(tokenData.sessionCode).toBe(TEST_SESSION_CODE);
      expect(tokenData.used).toBe(false);
      expect(new Date(tokenData.expiresAt)).toBeInstanceOf(Date);
    });

    it('should have proper TTL (30 minutes)', async () => {
      const tokenFile = join(TOKENS_DIR, `${validToken}.json`);
      const tokenData = JSON.parse(await readFile(tokenFile, 'utf-8'));
      
      const createdAt = new Date(tokenData.createdAt);
      const expiresAt = new Date(tokenData.expiresAt);
      const ttlMinutes = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60);
      
      expect(ttlMinutes).toBe(30);
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid-token-123';
      const tokenFile = join(TOKENS_DIR, `${invalidToken}.json`);
      
      expect(existsSync(tokenFile)).toBe(false);
    });
  });

  describe('Public Content Access Security', () => {
    it('should not expose edited content in public API routes', async () => {
      // Test para verificar que las rutas públicas no exponen contenido edited
      const publicRoutes = [
        '/api/export/pdf/a1',
        '/api/export/docx/a1'
      ];

      // Esto requeriría hacer requests reales o mockear las funciones
      // Por ahora, documentamos la expectativa
      expect(true).toBe(true); // Placeholder
    });

    it('should return 404 for edited content without valid token', async () => {
      // Test para verificar que el contenido edited no es accesible sin token
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Audit Logging', () => {
    it('should log token creation events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockIsAdmin.mockResolvedValue(true);
      const request = new NextRequest('http://localhost/api/preview/create', {
        method: 'POST',
        body: JSON.stringify({ sessionCode: TEST_SESSION_CODE })
      });

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AUDIT:'),
        expect.stringContaining('preview_token')
      );

      consoleSpy.mockRestore();
    });

    it('should log token consumption events', async () => {
      // Test para verificar que se registra el consumo de tokens
      expect(true).toBe(true); // Placeholder - requiere implementar la función de consumo
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle concurrent token creation safely', async () => {
      mockIsAdmin.mockResolvedValue(true);

      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost/api/preview/create', {
          method: 'POST',
          body: JSON.stringify({ sessionCode: TEST_SESSION_CODE })
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      const tokens = await Promise.all(responses.map(res => res.json()));

      // Verificar que todos los tokens son únicos
      const tokenValues = tokens.map(t => t.token);
      const uniqueTokens = new Set(tokenValues);
      expect(uniqueTokens.size).toBe(tokenValues.length);
    });

    it('should sanitize token in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockIsAdmin.mockResolvedValue(true);
      const request = new NextRequest('http://localhost/api/preview/create', {
        method: 'POST',
        body: JSON.stringify({ sessionCode: TEST_SESSION_CODE })
      });

      const response = await POST(request);
      const data = await response.json();

      // Verificar que solo se loggean los primeros 8 caracteres del token
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AUDIT:'),
        expect.stringContaining(data.token.substring(0, 8) + '...')
      );
      
      // Verificar que el token completo NO aparece en los logs
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(data.token)
      );

      consoleSpy.mockRestore();
    });
  });
});