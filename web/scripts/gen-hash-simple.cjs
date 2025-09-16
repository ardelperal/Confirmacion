const argon2 = require('argon2');
const readline = require('readline');

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MB
  timeCost: 3,       // 3 iteraciones
  parallelism: 1     // 1 hilo
};

async function generateHash(password) {
  try {
    const hash = await argon2.hash(password, ARGON2_OPTIONS);
    return hash;
  } catch (error) {
    throw new Error(`Error generando hash: ${error.message}`);
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('=== Generador de Hash Argon2id para Administrador ===\n');
  
  // Si se pasa la contraseña como argumento
  if (process.argv[2]) {
    try {
      const password = process.argv[2];
      const hash = await generateHash(password);
      console.log('\n✅ Hash generado exitosamente:');
      console.log(hash);
      console.log('\n📋 Copia este hash y úsalo como valor para ADMIN_PASSWORD_HASH en tu archivo .env');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  // Modo interactivo
  rl.question('Ingresa la contraseña de administrador: ', async (password) => {
    if (!password || password.trim().length === 0) {
      console.log('❌ La contraseña no puede estar vacía');
      rl.close();
      return;
    }

    try {
      const hash = await generateHash(password);
      console.log('\n✅ Hash generado exitosamente:');
      console.log(hash);
      console.log('\n📋 Copia este hash y úsalo como valor para ADMIN_PASSWORD_HASH en tu archivo .env');
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
    
    rl.close();
  });
}

main().catch(console.error);