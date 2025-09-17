#!/usr/bin/env node

/**
 * Script para generar hash de contraseña de administrador
 * Uso: npm run hash:admin
 * Luego ingresa la contraseña cuando se solicite
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

async function main() {
  try {
    console.log('🔐 Generador de hash para contraseña de administrador\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const password = await new Promise((resolve) => {
      rl.question('Ingresa la contraseña de administrador: ', (answer) => {
        resolve(answer);
      });
    });
    
    rl.close();
    
    if (!password || password.trim().length === 0) {
      console.error('❌ Error: La contraseña no puede estar vacía');
      process.exit(1);
    }
    
    if (password.length < 6) {
      console.error('❌ Error: La contraseña debe tener al menos 6 caracteres');
      process.exit(1);
    }
    
    console.log('Generando hash...');
    
    // Generar hash con bcrypt (12 rounds para buena seguridad)
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('\n✅ Hash generado exitosamente:');
    console.log('\n' + '='.repeat(60));
    console.log('ADMIN_PASSWORD_HASH=' + hash);
    console.log('='.repeat(60));
    
    console.log('\n📝 Instrucciones:');
    console.log('1. Copia el hash completo (incluyendo ADMIN_PASSWORD_HASH=)');
    console.log('2. Pégalo en tu archivo .env');
    console.log('3. Reinicia la aplicación');
    
    console.log('\n🔒 Información de seguridad:');
    console.log(`- Algoritmo: bcrypt con ${saltRounds} rounds`);
    console.log('- El hash es seguro para almacenar en variables de entorno');
    console.log('- Nunca compartas este hash públicamente');
    
  } catch (error) {
    console.error('\n❌ Error al generar el hash:', error.message);
    process.exit(1);
  }
}

// Manejar interrupciones
process.on('SIGINT', () => {
  console.log('\n\nOperación cancelada.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nOperación cancelada.');
  process.exit(0);
});

main().catch((error) => {
  console.error('Error inesperado:', error);
  process.exit(1);
});