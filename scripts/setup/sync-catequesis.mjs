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
const SOURCE_ASSETS_DIR = path.join(SOURCE_DIR, 'assets');
const DEST_ASSETS_DIR = path.join(DEST_DIR, 'assets');

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

function normalizeKey(p) {
  return p.replace(/\\/g, '/').toLowerCase();
}

let sourceAssetIndex;

async function buildSourceAssetIndex() {
  if (sourceAssetIndex) return sourceAssetIndex;

  sourceAssetIndex = new Map();

  async function walk(dir, base = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      const relPath = path.join(base, entry.name);

      if (entry.isDirectory()) {
        await walk(absPath, relPath);
      } else if (entry.isFile()) {
        const key = normalizeKey(relPath);
        if (!sourceAssetIndex.has(key)) {
          sourceAssetIndex.set(key, absPath);
        }
      }
    }
  }

  try {
    await walk(SOURCE_ASSETS_DIR);
  } catch (error) {
    console.error(`? Error construyendo índice de assets: ${error.message}`);
  }

  return sourceAssetIndex;
}

async function ensureAsset(relativePath) {
  const destPath = path.join(DEST_ASSETS_DIR, relativePath);

  try {
    await fs.access(destPath);
    return;
  } catch {
    // Continuar para intentar recuperarlo
  }

  const assetMap = await buildSourceAssetIndex();
  const sourcePath = assetMap.get(normalizeKey(relativePath));
  if (!sourcePath) {
    console.warn(`? Asset no encontrado para ${relativePath}`);
    return;
  }

  await ensureDirectory(path.dirname(destPath));
  await fs.copyFile(sourcePath, destPath);
  console.log(`V Asset corregido: ${relativePath}`);
}

async function ensureHtmlAssets(htmlContent) {
  const regex = /\/recursos\/catequesis\/assets\/([^"'>]+)/g;
  const seen = new Set();
  let match;

  while ((match = regex.exec(htmlContent)) !== null) {
    const relPath = match[1];
    if (seen.has(relPath)) continue;
    seen.add(relPath);
    await ensureAsset(relPath);
  }
}

/**
 * Normaliza rutas relativas dentro de los HTML copiados
 */
async function fixHtmlResources(destDir) {
  const entries = await fs.readdir(destDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      await fixHtmlResources(entryPath);
      continue;
    }

    if (!entry.name.endsWith('.html')) {
      continue;
    }

    let content = await fs.readFile(entryPath, 'utf8');

    content = content
      .replace(/\.\.\/assets\/characters\//g, '/recursos/catequesis/assets/characters/')
      .replace(/src="assets\//g, 'src="/recursos/catequesis/assets/')
      .replace(/\.\.\/styles\/fichas\.css/g, '/recursos/catequesis/styles/fichas.css');

    await ensureHtmlAssets(content);
    await fs.writeFile(entryPath, content, 'utf8');
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

    console.log('\n🛠️ Normalizando rutas en ficheros HTML...');
    await fixHtmlResources(DEST_DIR);
    
    // Crear index.html en recursos si no existe
    const recursosDir = path.join(PROJECT_ROOT, 'web', 'public', 'recursos');
    const indexPath = path.join(recursosDir, 'index.html');
    
    try {
      await fs.access(indexPath);
      console.log('✓ index.html ya existe en recursos');
    } catch {
      console.log('📝 Creando index.html en recursos...');
      const htmlContent = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Recursos</title>
<body><h1>Recursos de Catequesis</h1>
<p><a href="/recursos/catequesis/indice_general.html">Entrar en catequesis</a></p>
</body></html>`;
      await fs.writeFile(indexPath, htmlContent, 'utf8');
      console.log('✓ index.html creado en recursos');
    }
    
    console.log('\n✅ Sincronización completada exitosamente');
    
  } catch (error) {
    console.error(`\n❌ Error durante la sincronización: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar la función main directamente
main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

export { main as syncCatequesis };
