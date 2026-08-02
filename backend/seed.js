const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando reseteo de datos semilla (Modo Limpio)...');

  const passwordHash = await bcrypt.hash('admin123', 10);
  
  // 1. Administrador del SaaS (ADMIN)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash, systemRole: 'ADMIN' },
    create: {
      username: 'admin',
      passwordHash,
      fullName: 'Administrador del SaaS',
      systemRole: 'ADMIN'
    }
  });

  // 2. Cliente CEO por defecto (opcional, pero útil para probar)
  await prisma.user.upsert({
    where: { username: 'ceo' },
    update: { passwordHash, systemRole: 'CEO' },
    create: {
      username: 'ceo',
      passwordHash,
      fullName: 'Cliente de Prueba (CEO)',
      systemRole: 'CEO'
    }
  });

  console.log('Base de datos inicializada con éxito.');
  console.log('Usuario ADMIN: admin / admin123');
  console.log('Usuario CEO: ceo / admin123');
  console.log('¡Entorno limpio! No hay negocios ni empleados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
