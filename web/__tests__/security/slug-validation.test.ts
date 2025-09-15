import { isValidSlug, assertValidSlug } from '@/lib/slug';

describe('Slug Validation', () => {
  describe('isValidSlug', () => {
    test('should accept valid slugs', () => {
      expect(isValidSlug('a1')).toBe(true);
      expect(isValidSlug('session-a1')).toBe(true);
      expect(isValidSlug('module-a')).toBe(true);
      expect(isValidSlug('test-123')).toBe(true);
      expect(isValidSlug('valid-slug-name')).toBe(true);
    });

    test('should reject invalid slugs', () => {
      expect(isValidSlug('../')).toBe(false);
      expect(isValidSlug('../../etc/passwd')).toBe(false);
      expect(isValidSlug('/absolute/path')).toBe(false);
      expect(isValidSlug('slug with spaces')).toBe(false);
      expect(isValidSlug('UPPERCASE')).toBe(false);
      expect(isValidSlug('slug_with_underscores')).toBe(false);
      expect(isValidSlug('-starts-with-dash')).toBe(false);
      expect(isValidSlug('ends-with-dash-')).toBe(false);
      expect(isValidSlug('double--dash')).toBe(false);
      expect(isValidSlug('')).toBe(false);
      expect(isValidSlug('special@chars')).toBe(false);
    });
  });

  describe('assertValidSlug', () => {
    test('should not throw for valid slugs', () => {
      expect(() => assertValidSlug('a1')).not.toThrow();
      expect(() => assertValidSlug('valid-slug')).not.toThrow();
    });

    test('should throw with status 400 for invalid slugs', () => {
      expect(() => assertValidSlug('../')).toThrow();
      expect(() => assertValidSlug('/absolute')).toThrow();
      expect(() => assertValidSlug('UPPERCASE')).toThrow();
      
      try {
        assertValidSlug('../dangerous');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toContain('Invalid slug');
      }
    });
  });

  describe('Path traversal protection', () => {
    test('should block directory traversal attempts', () => {
      const maliciousInputs = [
        '../',
        '../../',
        '../../../etc/passwd',
        '..\\',
        '..\\..\\windows\\system32',
        '%2e%2e%2f',
        '%2e%2e/',
        '..%2f',
        '..%5c'
      ];

      maliciousInputs.forEach(input => {
        expect(isValidSlug(input)).toBe(false);
        expect(() => assertValidSlug(input)).toThrow();
      });
    });

    test('should block absolute paths', () => {
      const absolutePaths = [
        '/etc/passwd',
        '/var/log/auth.log',
        'C:\\Windows\\System32',
        '/home/user/.ssh/id_rsa',
        '\\server\\share'
      ];

      absolutePaths.forEach(path => {
        expect(isValidSlug(path)).toBe(false);
        expect(() => assertValidSlug(path)).toThrow();
      });
    });
  });
});