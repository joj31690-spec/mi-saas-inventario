const prisma = require('../prismaClient');

const getProductAvgCost = async (productId, businessId) => {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      productId: productId,
      businessId: businessId,
      type: 'ENTRY',
      cost: { not: null }
    }
  });
  if (movements.length === 0) return null;
  
  let sumCost = 0;
  let sumQty = 0;
  for (const mov of movements) {
    sumCost += parseFloat(mov.cost);
    sumQty += parseFloat(mov.quantity);
  }
  return sumCost / sumQty;
};

const checkCircularDependency = async (targetIngredientId, recipeItemsToCheck, businessId) => {
  const visited = new Set();
  
  const dfs = async (ingredientId) => {
    if (ingredientId === targetIngredientId) return true; // Ciclo encontrado
    if (visited.has(ingredientId)) return false;
    visited.add(ingredientId);

    const ing = await prisma.ingredient.findFirst({
      where: { id: ingredientId, businessId: businessId },
      include: { recipeItems: true }
    });

    if (ing && ing.recipeItems) {
      for (const item of ing.recipeItems) {
        if (item.childIngredientId) {
          const hasCycle = await dfs(item.childIngredientId);
          if (hasCycle) return true;
        }
      }
    }
    return false;
  };

  for (const item of recipeItemsToCheck) {
    if (item.childIngredientId) {
      const hasCycle = await dfs(item.childIngredientId);
      if (hasCycle) return true;
    }
  }

  return false;
};

const resolveIngredientConsumption = async (ingredientId, businessId, amountNeeded = 1) => {
  const consumptionMap = new Map();

  const resolveNode = async (ingId, amount) => {
    const ing = await prisma.ingredient.findFirst({
      where: { id: ingId, businessId: businessId },
      include: { recipeItems: true }
    });

    if (!ing) return;

    if (ing.type === 'DIRECTO' && ing.linkedProductId) {
      const current = consumptionMap.get(ing.linkedProductId) || 0;
      consumptionMap.set(ing.linkedProductId, current + amount);
    } else if (ing.type === 'PREPARADO' && ing.recipeItems) {
      const yieldQty = parseFloat(ing.yieldQuantity) || 1;
      for (const item of ing.recipeItems) {
        const itemAmount = (amount * parseFloat(item.quantity)) / yieldQty;
        if (item.productId) {
          const current = consumptionMap.get(item.productId) || 0;
          consumptionMap.set(item.productId, current + itemAmount);
        } else if (item.childIngredientId) {
          await resolveNode(item.childIngredientId, itemAmount);
        }
      }
    }
  };

  await resolveNode(ingredientId, amountNeeded);
  return consumptionMap;
};

const resolveIngredientCost = async (ingredientId, businessId) => {
  const ing = await prisma.ingredient.findFirst({
    where: { id: ingredientId, businessId: businessId },
    include: { recipeItems: true }
  });

  if (!ing) return null;

  if (ing.type === 'DIRECTO' && ing.linkedProductId) {
    return await getProductAvgCost(ing.linkedProductId, businessId);
  } else if (ing.type === 'PREPARADO') {
    let loteCost = 0;
    for (const item of ing.recipeItems) {
      if (item.productId) {
        const cost = await getProductAvgCost(item.productId, businessId);
        if (cost === null) return null; // O podríamos asumir 0, pero null es más seguro para detectar faltantes
        loteCost += cost * parseFloat(item.quantity);
      } else if (item.childIngredientId) {
        const cost = await resolveIngredientCost(item.childIngredientId, businessId);
        if (cost === null) return null;
        loteCost += cost * parseFloat(item.quantity);
      }
    }
    const yieldQty = parseFloat(ing.yieldQuantity) || 1;
    return loteCost / yieldQty;
  }
  return 0;
};

module.exports = {
  getProductAvgCost,
  checkCircularDependency,
  resolveIngredientConsumption,
  resolveIngredientCost
};
