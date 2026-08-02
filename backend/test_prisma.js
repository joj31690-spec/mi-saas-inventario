const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'admin' },
      include: { role: true },
    });
    console.log("Usuario encontrado con rol:", user);
  } catch (error) {
    console.error("Error al buscar usuario:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
