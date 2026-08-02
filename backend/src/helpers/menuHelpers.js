/**
 * menuHelpers.js - Fuente de verdad única para el estado del menú
 */
const { resolveIngredientConsumption } = require('./ingredientResolver');

async function getMenuItemStatus(menuItemId, prisma) {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      recipeItems: {
        include: {
          ingredient: {
            include: {
              linkedProduct: true,
              recipeItems: {
                include: { product: true }
              }
            }
          }
        }
      },
      linkedProduct: true // Para REVENTA
    }
  });

  if (!menuItem) {
    return { publishable: false, status: 'Borrador', reason: 'missing_product', warnings: [] };
  }

  // Si el administrador lo marcó como no disponible manualmente (aplica a ambos tipos)
  if (menuItem.status === 'No disponible' && menuItem.statusReason === 'manual') {
    return { publishable: true, status: 'No disponible', reason: 'manual', warnings: [] };
  }

  const warnings = [];

  // Lógica para REVENTA
  if (menuItem.type === 'REVENTA') {
    if (menuItem.price === null || menuItem.price === undefined || parseFloat(menuItem.price) <= 0) {
      return { publishable: false, status: 'Borrador', reason: 'missing_price', warnings: [] };
    }

    if (!menuItem.linkedProduct) {
      return { publishable: false, status: 'Borrador', reason: 'missing_product', warnings: [] };
    }

    if (!menuItem.linkedProduct.isActive) {
      return { publishable: false, status: 'No disponible', reason: 'inactive_ingredient', warnings: [] };
    }

    if (parseFloat(menuItem.linkedProduct.currentStock) <= 0) {
      return { publishable: true, status: 'No disponible', reason: 'out_of_stock', warnings: [] };
    }

    return { publishable: true, status: menuItem.status === 'Borrador' ? 'Borrador' : 'Disponible', reason: 'complete', warnings: [] };
  }

  // Lógica para PREPARADO
  if (!menuItem.recipeItems || menuItem.recipeItems.length === 0) {
    return { publishable: false, status: 'Borrador', reason: 'missing_recipe', warnings: [], maxAvailablePlates: 0 };
  }

  const totalConsumptionMap = new Map();

  for (const item of menuItem.recipeItems) {
    if (parseFloat(item.quantity) <= 0) {
      return { publishable: false, status: 'Borrador', reason: 'invalid_quantity', warnings: [], maxAvailablePlates: 0 };
    }
    const ing = item.ingredient;
    if (!ing || !ing.isActive) {
      return { publishable: false, status: 'No disponible', reason: 'inactive_ingredient', warnings: [], maxAvailablePlates: 0 };
    }

    const consumptionMap = await resolveIngredientConsumption(item.ingredientId, menuItem.businessId, parseFloat(item.quantity));
    for (const [productId, requiredAmount] of consumptionMap.entries()) {
      const current = totalConsumptionMap.get(productId) || 0;
      totalConsumptionMap.set(productId, current + requiredAmount);
    }
  }

  let maxAvailablePlates = Infinity;

  for (const [productId, requiredAmount] of totalConsumptionMap.entries()) {
    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod || !prod.isActive) return { publishable: false, status: 'No disponible', reason: 'inactive_ingredient', warnings: [], maxAvailablePlates: 0 };
    
    const available = parseFloat(prod.currentStock);
    if (available <= 0) {
      return { publishable: true, status: 'No disponible', reason: 'out_of_stock', warnings: [], maxAvailablePlates: 0 };
    }
    
    const possiblePlates = Math.floor(available / requiredAmount);
    if (possiblePlates < maxAvailablePlates) {
      maxAvailablePlates = possiblePlates;
    }

    if (available < requiredAmount) {
      // Si no alcanza para 1 solo plato
      return { publishable: true, status: 'No disponible', reason: 'out_of_stock', warnings: [], maxAvailablePlates: 0 };
    }
  }

  if (maxAvailablePlates === Infinity) maxAvailablePlates = 0;

  // Si pasa las validaciones de PREPARADO
  return { 
    publishable: true, 
    status: menuItem.status === 'Borrador' ? 'Borrador' : 'Disponible', 
    reason: 'complete', 
    warnings,
    maxAvailablePlates
  };
}

module.exports = { getMenuItemStatus };
