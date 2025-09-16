#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de rutas
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(PROJECT_ROOT, 'external', 'catequesis');
const DEST_DIR = path.join(PROJECT_ROOT, 'web', 'public', 'recursos', 'catequesis');

// Archivos y directorios a excluir
const EXCLUDED_ITEMS = new Set([
  '.git',
  '.github',
  'node_modules',
  'README.md',
  'LICENSE',
  'CNAME',
  'netlify.toml',
  '.gitignore',
  '.trae'
]);

/**
 * Verifica si un archivo o directorio debe ser excluido
 */
function shouldExclude(itemName) {
  return EXCLUDED_ITEMS.has(itemName);
}

/**
 * Elimina recursivamente un directorio
 */
async function removeDirectory(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`✓ Directorio eliminado: ${dirPath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Crea un directorio si no existe
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Copia un archivo
 */
async function copyFile(srcPath, destPath) {
  try {
    await ensureDirectory(path.dirname(destPath));
    await fs.copyFile(srcPath, destPath);
    console.log(`✓ Copiado: ${path.relative(PROJECT_ROOT, srcPath)} → ${path.relative(PROJECT_ROOT, destPath)}`);
  } catch (error) {
    console.error(`✗ Error copiando ${srcPath}: ${error.message}`);
    throw error;
  }
}

/**
 * Copia recursivamente un directorio
 */
async function copyDirectory(srcDir, destDir) {
  try {
    const items = await fs.readdir(srcDir);
    
    for (const item of items) {
      // Saltar elementos excluidos
      if (shouldExclude(item)) {
        console.log(`⊘ Excluido: ${item}`);
        continue;
      }

      const srcPath = path.join(srcDir, item);
      const destPath = path.join(destDir, item);
      
      const stat = await fs.stat(srcPath);
      
      if (stat.isDirectory()) {
        await ensureDirectory(destPath);
        await copyDirectory(srcPath, destPath);
      } else if (stat.isFile()) {
        await copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error(`✗ Error procesando directorio ${srcDir}: ${error.message}`);
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🔄 Iniciando sincronización de catequesis...');
  console.log(`📂 Fuente: ${SOURCE_DIR}`);
  console.log(`📂 Destino: ${DEST_DIR}`);
  
  try {
    // Verificar que el directorio fuente existe
    try {
      await fs.access(SOURCE_DIR);
    } catch (error) {
      console.error(`✗ Error: El directorio fuente no existe: ${SOURCE_DIR}`);
      process.exit(1);
    }

    // Limpiar directorio destino
    console.log('\n🧹 Limpiando directorio destino...');
    await removeDirectory(DEST_DIR);
    
    // Crear directorio destino
    await ensureDirectory(DEST_DIR);
    
    // Copiar contenido
    console.log('\n📋 Copiando archivos...');
    await copyDirectory(SOURCE_DIR, DEST_DIR);
    
    console.log('\n✅ Sincronización completada exitosamente');
    
  } catch (error) {
    console.error(`\n❌ Error durante la sincronización: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar solo si es el módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

export { main as syncCatequesis };