#!/usr/bin/env ts-node

import * as argon2 from 'argon2';
import * as readline from 'readline';
import { stdin as input, stdout as output } from 'process';

/**
 * Script CLI para generar hashes argon2id seguros para contraseñas de administrador
 * Uso: npm run hash:admin
 * O directamente: ts-node scripts/gen-admin-hash.ts
 */

export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MB
  timeCost: 3,       // 3 iteraciones
  parallelism: 1     // 1 hilo
};

async function hideInput(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input, output });
    
    // Verificar si stdin es un TTY y soporta setRawMode
    const stdin = process.stdin;
    const isTTY = stdin.isTTY && typeof stdin.setRawMode === 'function';
    
    if (isTTY) {
      // Modo interactivo con entrada oculta
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      
      let password = '';
      
      output.write('Ingresa la contraseña de administrador: ');
      
      stdin.on('data', (key: string) => {
        // Ctrl+C para salir
        if (key === '\u0003') {
          process.exit();
        }
        
        // Enter para confirmar
        if (key === '\r' || key === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          output.write('\n');
          rl.close();
          resolve(password);
          return;
        }
        
        // Backspace
        if (key === '\u007f') {
          if (password.length > 0) {
            password = password.slice(0, -1);
            output.write('\b \b');
          }
          return;
        }
        
        // Caracteres normales
        if (key >= ' ' && key <= '~') {
          password += key;
          output.write('*');
        }
      });
    } else {
      // Modo no interactivo (pipe, redirección, etc.)
      let inputData = '';
      stdin.on('data', (chunk) => {
        inputData += chunk.toString();
      });
      
      stdin.on('end', () => {
        const password = inputData.trim();
        rl.close();
        if (password) {
          resolve(password);
        } else {
          console.error('❌ Error: No se proporcionó contraseña');
          process.exit(1);
        }
      });
      
      // Si no hay datos después de un tiempo, solicitar entrada
      setTimeout(() => {
        if (!inputData) {
          output.write('Ingresa la contraseña de administrador: ');
        }
      }, 100);
    }
  });
}

export async function generateHash(password: string): Promise<string> {
  try {
    const hash = await argon2.hash(password, ARGON2_OPTIONS);
    return hash;
  } catch (error) {
    throw new Error(`Error generando hash: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

export async function verifyHash(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error('Error verificando hash:', error instanceof Error ? error.message : 'Error desconocido');
    return false;
  }
}

async function main() {
  try {
    console.log('=== Generador de Hash Argon2id para Administrador ===\n');
    
    // Verificar si se pasó contraseña como argumento (solo para desarrollo)
    const args = process.argv.slice(2);
    let password: string;
    
    if (args.includes('--password') && process.env.NODE_ENV === 'development') {
      const passwordIndex = args.indexOf('--password');
      if (passwordIndex !== -1 && args[passwordIndex + 1]) {
        password = args[passwordIndex + 1];
        console.log('⚠️  Usando contraseña desde argumentos (solo desarrollo)');
      } else {
        console.error('Error: --password requiere un valor');
        process.exit(1);
      }
    } else {
      // Leer contraseña de forma segura
      password = await hideInput();
    }
    
    if (!password || password.length < 8) {
      console.error('\n❌ Error: La contraseña debe tener al menos 8 caracteres');
      process.exit(1);
    }
    
    console.log('\n🔄 Generando hash seguro...');
    
    const hash = await generateHash(password);
    
    console.log('\n✅ Hash generado exitosamente:');
    console.log('\n' + '='.repeat(80));
    console.log(hash);
    console.log('='.repeat(80));
    
    // Verificar que el hash funciona correctamente
    console.log('\n🔍 Verificando hash...');
    const isValid = await verifyHash(password, hash);
    
    if (isValid) {
      console.log('✅ Verificación exitosa: El hash es válido');
      console.log('\n📋 Instrucciones:');
      console.log('1. Copia el hash de arriba');
      console.log('2. Añádelo a tu archivo .env como:');
      console.log('   ADMIN_PASSWORD_HASH="' + hash + '"');
      console.log('3. Elimina cualquier variable de contraseña en texto plano del .env');
      console.log('4. Reinicia la aplicación');
    } else {
      console.error('❌ Error: La verificación del hash falló');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Error desconocido');
    process.exit(1);
  }
}

// Ejecutar solo si es el archivo principal
if (require.main === module) {
  main();
}