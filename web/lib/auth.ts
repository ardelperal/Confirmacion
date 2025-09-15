import * as argon2 from 'argon2';
import { cookies } from 'next/headers';
import { AuthUser, AppConfig } from '@/types';
import { verifyParishPassword } from './parish-auth';
import { 
  signAccessToken, 
  verifyAccessToken, 
  extractTokenFromCookies,
  createSecureCookieHeader,
  createClearCookieHeader,
  type JWTPayload 
} from './jwt';

// Configuración desde variables de entorno
export function getAppConfig(): AppConfig {
  // Validar que ADMIN_PASSWORD_HASH existe
  if (!process.env.ADMIN_PASSWORD_HASH) {
    throw new Error(
      'ADMIN_PASSWORD_HASH no está configurado. ' +
      'Genera un hash con: npm run hash:admin'
    );
  }

  return {
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    readOnly: process.env.READ_ONLY === 'true',
    visibilityMode: (process.env.VISIBILITY_MODE as 'publish' | 'edited') || 'publish'
  };
}

// Verificar contraseña de admin (dual: desarrollador + párroco)
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const config = getAppConfig();
    
    // Verificar contraseña maestra del desarrollador (desde .env con argon2)
    const isValidAdmin = await argon2.verify(config.adminPasswordHash, password);
    if (isValidAdmin) {
      return true;
    }
    
    // Verificar contraseña del párroco (desde archivo)
    return await verifyParishPassword(password);
  } catch (error) {
    // Log del error sin exponer información sensible
    console.error('Error verificando contraseña de admin:', error instanceof Error ? error.message : 'Error desconocido');
    return false;
  }
}

// Generar JWT token con configuración endurecida
export function generateToken(user: AuthUser): string {
  return signAccessToken({
    id: user.id,
    username: user.username,
    role: user.role
  });
}

// Verificar JWT token con rotación de secretos y clock skew
export function verifyToken(token: string): { user: AuthUser | null; needsRefresh: boolean; error?: string } {
  const result = verifyAccessToken(token);
  
  if (result.payload && !result.error) {
    return {
      user: {
        id: result.payload.id,
        username: result.payload.username,
        role: result.payload.role as 'admin'
      },
      needsRefresh: result.needsRefresh || false,
      error: result.error
    };
  }
  
  return {
    user: null,
    needsRefresh: false,
    error: result.error || 'Token inválido'
  };
}

// Obtener usuario autenticado desde cookies seguras
export async function getAuthenticatedUser(): Promise<{ user: AuthUser | null; needsRefresh: boolean }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_access')?.value;
    
    if (!token) {
      return { user: null, needsRefresh: false };
    }
    
    const result = verifyToken(token);
    return { user: result.user, needsRefresh: result.needsRefresh };
  } catch (error) {
    return { user: null, needsRefresh: false };
  }
}

// Verificar si el usuario es admin
export async function isAdmin(): Promise<boolean> {
  const { user } = await getAuthenticatedUser();
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

// Verificar autenticación de admin para APIs con JWT endurecido
export async function verifyAdminAuth(request?: Request): Promise<{
  success: boolean;
  user: AuthUser | null;
  needsRefresh?: boolean;
  error?: string;
}> {
  let user: AuthUser | null = null;
  let needsRefresh = false;
  let error: string | undefined;
  
  if (request) {
    // Si se proporciona request, verificar cookies directamente
    const cookieHeader = request.headers.get('cookie');
    const token = extractTokenFromCookies(cookieHeader);
    
    if (token) {
      const result = verifyToken(token);
      user = result.user;
      needsRefresh = result.needsRefresh;
      error = result.error;
    }
  } else {
    // Fallback al método original
    const authResult = await getAuthenticatedUser();
    user = authResult.user;
    needsRefresh = authResult.needsRefresh;
  }
  
  const isAdminUser = user?.role === 'admin';
  
  return {
    success: isAdminUser,
    user: isAdminUser ? user : null,
    needsRefresh,
    error
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