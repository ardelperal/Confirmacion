// Test script para verificar carga de variables de entorno
console.log('=== Test de Variables de Entorno ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

console.log('=== Sin dotenv ===');
console.log('ADMIN_PASSWORD_HASH exists:', !!process.env.ADMIN_PASSWORD_HASH);
console.log('ADMIN_PASSWORD_HASH value:', process.env.ADMIN_PASSWORD_HASH);
console.log('');

console.log('=== Con dotenv ===');
require('dotenv').config();
console.log('ADMIN_PASSWORD_HASH exists:', !!process.env.ADMIN_PASSWORD_HASH);
console.log('ADMIN_PASSWORD_HASH value:', process.env.ADMIN_PASSWORD_HASH);
console.log('ADMIN_PASSWORD_HASH length:', process.env.ADMIN_PASSWORD_HASH?.length);
console.log('First char:', process.env.ADMIN_PASSWORD_HASH?.[0]);
console.log('Starts with $:', process.env.ADMIN_PASSWORD_HASH?.startsWith('$'));

console.log('');
console.log('=== Probando argon2 ===');
const argon2 = require('argon2');
if (process.env.ADMIN_PASSWORD_HASH) {
  argon2.verify(process.env.ADMIN_PASSWORD_HASH, 'Arm1833a')
    .then(result => console.log('Argon2 verification:', result))
    .catch(err => console.error('Argon2 error:', err.message));
} else {
  console.log('No hash to verify');
}