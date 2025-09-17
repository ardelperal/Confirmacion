import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Función para verificar Gotenberg con timeout
async function checkGotenbergHealth(): Promise<{ healthy: boolean; error?: string }> {
  const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://gotenberg:3000';
  const TIMEOUT = 5000; // 5 segundos
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(`${GOTENBERG_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return { healthy: true };
    } else {
      return { healthy: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { healthy: false, error: 'Timeout' };
      }
      return { healthy: false, error: error.message };
    }
    return { healthy: false, error: 'Unknown error' };
  }
}

export async function GET() {
  const checks: Record<string, any> = {};
  let overallHealthy = true;
  
  try {
    // 1. Verificar que el directorio de contenido existe y es accesible
    const contentDir = path.join(process.cwd(), 'content');
    await fs.access(contentDir);
    checks.contentDir = { healthy: true };
    
    // 2. Verificar que el directorio de sesiones existe
    const sessionsDir = path.join(contentDir, 'sessions');
    await fs.access(sessionsDir);
    checks.sessionsDir = { healthy: true };
    
  } catch (error) {
    checks.filesystem = { 
      healthy: false, 
      error: 'Content directories not accessible' 
    };
    overallHealthy = false;
  }
  
  // 3. Verificar Gotenberg (opcional, no afecta el estado general)
  const gotenbergCheck = await checkGotenbergHealth();
  checks.gotenberg = gotenbergCheck;
  
  // Gotenberg no es crítico para el funcionamiento básico
  // Solo se marca como unhealthy si fallan los checks críticos
  
  const response = {
    status: overallHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks
  };
  
  return NextResponse.json(response, {
    status: overallHealthy ? 200 : 503
  });
}