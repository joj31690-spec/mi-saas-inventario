const bcrypt = require('bcrypt');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("Por favor, proporciona la contraseña que deseas encriptar.");
  console.log("Uso: node hash_password.js miContraseñaSegura123");
  process.exit(1);
}

const plainPassword = args[0];

bcrypt.hash(plainPassword, 10).then(hash => {
  console.log("\nContraseña original:", plainPassword);
  console.log("Hash generado (cópialo en tu SQL):");
  console.log(hash);
  console.log("\nEjemplo de SQL:");
  console.log(`INSERT INTO users (username, password_hash, full_name, system_role, is_active, can_manage_users, can_edit_users, can_delete_users, created_at, updated_at) VALUES ('usuario341', '${hash}', 'Administrador Principal', 'ADMIN', true, true, true, true, NOW(), NOW());`);
});
