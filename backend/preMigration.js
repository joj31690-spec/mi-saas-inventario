const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Buscando usuarios con rol CAJERO...');
  
  // Como CAJERO es un enum en la base de datos, si la BD postgres usa enums nativos, no podemos borrarlo sin más.
  // Prisma no lo borra tan fácilmente, Prisma va a dropear el enum y crearlo de nuevo en `db push`.
  // Si no limpiamos los registros primero, `db push` fallaría.
  
  // Usamos SQL crudo si hay problemas o prisma normal.
  // Ya que Prisma maneja el enum, es seguro hacer el update a nivel ORM antes del cambio de schema.
  
  const result = await prisma.$executeRaw`UPDATE "business_users" SET role = 'EMPLEADO' WHERE role = 'CAJERO'`;
  
  console.log(`Migración completada. ${result} registros actualizados de CAJERO a EMPLEADO.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
