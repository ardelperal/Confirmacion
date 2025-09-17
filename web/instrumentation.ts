/**
 * Archivo de instrumentación de Next.js
 * Se ejecuta una vez al arranque del servidor para validar configuración crítica
 */

export async function register() {
  // Solo ejecutar en el servidor (no en el cliente)
  if (typeof window === 'undefined') {
    try {
      // Importar dinámicamente para evitar problemas en el cliente
      const { validateEnvironmentVariables } = await import('./lib/env-validation');
      
      // Validar variables de entorno críticas
      validateEnvironmentVariables();
      
      console.log('🚀 Aplicación iniciada correctamente con configuración validada');
    } catch (error) {
      console.error('💥 Error crítico en la configuración:');
      console.error(error instanceof Error ? error.message : String(error));
      
      // En producción, terminar el proceso si la configuración es inválida
      if (process.env.NODE_ENV === 'production') {
        console.error('🛑 Terminando aplicación debido a configuración inválida');
        process.exit(1);
      }
      
      // En desarrollo, solo mostrar el error pero continuar
      console.warn('⚠️  Continuando en modo desarrollo con configuración inválida');
    }
  }
}