const prisma = require('./src/prismaClient');

async function main() {
  const menuItems = await prisma.menuItem.findMany({ include: { recipeItems: true } });
  console.log('MenuItems:', JSON.stringify(menuItems, null, 2));

  const recipeItems = await prisma.recipeItem.findMany();
  console.log('RecipeItems:', JSON.stringify(recipeItems, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
