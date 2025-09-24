import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

interface ParishAuth {
  hashedPassword: string;
  lastChanged: string;
  isDefault: boolean;
}

const AUTH_FILE_PATH = path.join(process.cwd(), 'data', 'parish-auth.json');
const DEFAULT_PARISH_PASSWORD = 'parroco123';

// Asegurar que el directorio data existe
function ensureDataDirectory() {
  const dataDir = path.dirname(AUTH_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Obtener configuración de autenticación del párroco
export async function getParishAuth(): Promise<ParishAuth> {
  ensureDataDirectory();
  
  try {
    if (fs.existsSync(AUTH_FILE_PATH)) {
      const data = fs.readFileSync(AUTH_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (_error) {
    console.error('Error reading parish auth file:', _error);
  }
  
  // Si no existe el archivo o hay error, crear configuración por defecto
  const defaultAuth: ParishAuth = {
    hashedPassword: await bcrypt.hash(DEFAULT_PARISH_PASSWORD, 10),
    lastChanged: new Date().toISOString(),
    isDefault: true
  };
  
  await saveParishAuth(defaultAuth);
  return defaultAuth;
}

// Guardar configuración de autenticación del párroco
export async function saveParishAuth(auth: ParishAuth): Promise<void> {
  ensureDataDirectory();
  
  try {
    fs.writeFileSync(AUTH_FILE_PATH, JSON.stringify(auth, null, 2));
  } catch (_error) {
    console.error('Error saving parish auth file:', _error);
    throw new Error('No se pudo guardar la configuración de autenticación');
  }
}

// Verificar contraseña del párroco
export async function verifyParishPassword(password: string): Promise<boolean> {
  try {
    const auth = await getParishAuth();
    return await bcrypt.compare(password, auth.hashedPassword);
  } catch (_error) {
    console.error('Error verifying parish password:', _error);
    return false;
  }
}

// Cambiar contraseña del párroco
export async function changeParishPassword(newPassword: string): Promise<boolean> {
  try {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const auth: ParishAuth = {
      hashedPassword,
      lastChanged: new Date().toISOString(),
      isDefault: false
    };
    
    await saveParishAuth(auth);
    return true;
  } catch (_error) {
    console.error('Error changing parish password:', _error);
    return false;
  }
}

// Verificar si se está usando la contraseña por defecto
export async function isUsingDefaultPassword(): Promise<boolean> {
  try {
    const auth = await getParishAuth();
    return auth.isDefault;
  } catch (_error) {
    return true;
  }
}