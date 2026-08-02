const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { 
      systemRole: 'CEO',
      createdAt: {
        lt: new Date('2026-07-26T00:00:00Z') // assuming ton was created after this
      }
    },
    data: { canDeleteUsers: true }
  });
  console.log(`Updated ${result.count} existing CEOs to canDeleteUsers = true.`);
  
  // Just in case, forcefully update 'jon' and 'jo'
  await prisma.user.updateMany({
    where: { username: { in: ['jon', 'jo'] } },
    data: { canDeleteUsers: true }
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
