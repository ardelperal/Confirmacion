import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { AuthUser, AppConfig } from '@/types';
import { verifyParishPassword } from './parish-auth';

// Configuración desde variables de entorno
export function getAppConfig(): AppConfig {
  return {
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    readOnly: process.env.READ_ONLY === 'true',
    visibilityMode: (process.env.VISIBILITY_MODE as 'publish' | 'edited') || 'publish'
  };
}

// Verificar contraseña de admin (dual: desarrollador + párroco)
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const config = getAppConfig();
  
  // Verificar contraseña maestra del desarrollador (desde .env)
  if (password === config.adminPassword) {
    return true;
  }
  
  // Verificar contraseña del párroco (desde archivo)
  return await verifyParishPassword(password);
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
    const cookieStore = await cookies();
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

// Verificar autenticación de admin para APIs
export async function verifyAdminAuth(request?: Request) {
  let userIsAdmin = false;
  
  if (request) {
    // Si se proporciona request, verificar cookies directamente
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      const token = cookies['auth-token'];
      const sessionData = cookies['auth-session'];
      
      if (token) {
        const user = verifyToken(token);
        userIsAdmin = user?.role === 'admin';
      } else if (sessionData) {
        try {
          const decodedSession = decodeURIComponent(sessionData);
          const session = JSON.parse(decodedSession);
          userIsAdmin = session?.role === 'admin';
        } catch (error) {
          // Si no se puede parsear la sesión, no está autorizado
          userIsAdmin = false;
        }
      }
    }
  } else {
    // Fallback al método original
    userIsAdmin = await isAdmin();
  }
  
  return {
    success: userIsAdmin,
    user: userIsAdmin ? { role: 'admin' } : null
  };
}

// Configuración de NextAuth (placeholder para compatibilidad)
export const authOptions = {
  // Esta configuración se puede expandir si se necesita NextAuth completo
  providers: [],
  callbacks: {
    async session({ session, token }: any) {
      return session;
    },
  },
};