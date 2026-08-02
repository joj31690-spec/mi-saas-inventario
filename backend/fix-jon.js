const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.update({
    where: { username: 'jon' },
    data: { canManageUsers: true }
  });
  console.log(`Updated jon back to canManageUsers = true.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
