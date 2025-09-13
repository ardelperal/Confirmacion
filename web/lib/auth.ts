import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { AuthUser, AppConfig } from '@/types';

// Configuración desde variables de entorno
export function getAppConfig(): AppConfig {
  return {
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    readOnly: process.env.READ_ONLY === 'true',
    visibilityMode: (process.env.VISIBILITY_MODE as 'publish' | 'edited') || 'publish'
  };
}

// Verificar contraseña de admin
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const config = getAppConfig();
  // En producción, la contraseña debería estar hasheada
  // Por simplicidad, comparamos directamente
  return password === config.adminPassword;
}

// Generar JWT token
export function generateToken(user: AuthUser): string {
  const config = getAppConfig();
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
}

// Verificar JWT token
export function verifyToken(token: string): AuthUser | null {
  try {
    const config = getAppConfig();
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
  } catch (error) {
    return null;
  }
}

// Obtener usuario autenticado desde cookies
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }
    
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

// Verificar si el usuario es admin
export async function isAdmin(): Promise<boolean> {
  const user = await getAuthenticatedUser();
  return user?.role === 'admin';
}

// Verificar si la aplicación está en modo solo lectura
export function isReadOnly(): boolean {
  const config = getAppConfig();
  return config.readOnly;
}

// Obtener modo de visibilidad
export function getVisibilityMode(): 'publish' | 'edited' {
  const config = getAppConfig();
  return config.visibilityMode;
}