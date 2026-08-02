const prisma = require('../prismaClient');
const { isMenuItemPublishable } = require('../helpers/menuHelpers');
const { businessWhere } = require('../utils/businessHelper');

// Tras modificar una receta, degradar el estado si ya no es publicable
async function degradeIfNeeded(menuItemId, reason, businessId) {
  const menuItem = await prisma.menuItem.findFirst({ 
    where: { id: menuItemId, businessId } 
  });
  if (!menuItem || menuItem.status !== 'Disponible') return;

  const { getMenuItemStatus } = require('../helpers/menuHelpers');
  const result = await getMenuItemStatus(menuItemId, prisma);
  if (!result.publishable) {
    await prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        status: 'No disponible',
        statusReason: reason || result.reason
      }
    });
  }
}

const getRecipeItems = async (req, res) => {
  try {
    const { id } = req.params; // menuItemId
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: parseInt(id), ...businessWhere(req) }
    });

    if (!menuItem) {
      return res.status(404).json({ message: 'Item de menú no encontrado en este negocio' });
    }

    const recipeItems = await prisma.recipeItem.findMany({
      where: { menuItemId: parseInt(id) },
      include: {
        ingredient: {
          include: { linkedProduct: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(recipeItems);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la receta', error: error.message });
  }
};

const createRecipeItem = async (req, res) => {
  try {
    const { id } = req.params; // menuItemId
    const { ingredientId, quantity } = req.body;

    if (!ingredientId || quantity === undefined || quantity === null || Number(quantity) <= 0) {
      return res.status(400).json({ message: 'Faltan campos obligatorios o la cantidad es inválida' });
    }

    const menuItem = await prisma.menuItem.findFirst({
      where: { id: parseInt(id), ...businessWhere(req) }
    });
    if (!menuItem) return res.status(404).json({ message: 'Item de menú no encontrado en este negocio' });

    const ingredient = await prisma.ingredient.findFirst({
      where: { id: parseInt(ingredientId), ...businessWhere(req) }
    });
    if (!ingredient) return res.status(404).json({ message: 'Ingrediente no encontrado en este negocio' });

    const newRecipeItem = await prisma.recipeItem.create({
      data: {
        menuItemId: parseInt(id),
        ingredientId: parseInt(ingredientId),
        quantity: Number(quantity)
      },
      include: {
        ingredient: {
          include: { linkedProduct: true }
        }
      }
    });
    res.status(201).json(newRecipeItem);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Este ingrediente ya está en la receta' });
    }
    res.status(500).json({ message: 'Error al añadir el ingrediente', error: error.message });
  }
};

const updateRecipeItem = async (req, res) => {
  try {
    const { id } = req.params; // recipeItemId
    const { quantity } = req.body;

    if (quantity === undefined || quantity === null || Number(quantity) <= 0) {
      return res.status(400).json({ message: 'La cantidad es inválida' });
    }

    const existingRecipeItem = await prisma.recipeItem.findFirst({
      where: { id: parseInt(id) },
      include: { menuItem: true }
    });

    if (!existingRecipeItem || existingRecipeItem.menuItem.businessId !== req.businessId) {
      return res.status(404).json({ message: 'Item de receta no encontrado' });
    }

    const updatedRecipeItem = await prisma.recipeItem.update({
      where: { id: parseInt(id) },
      data: { quantity: Number(quantity) },
      include: {
        ingredient: {
          include: { linkedProduct: true }
        }
      }
    });

    await degradeIfNeeded(updatedRecipeItem.menuItemId, null, req.businessId);

    res.json(updatedRecipeItem);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el ingrediente', error: error.message });
  }
};

const deleteRecipeItem = async (req, res) => {
  try {
    const { id } = req.params; // recipeItemId

    const recipeItem = await prisma.recipeItem.findFirst({ 
      where: { id: parseInt(id) },
      include: { menuItem: true }
    });

    if (!recipeItem || recipeItem.menuItem.businessId !== req.businessId) {
      return res.status(404).json({ message: 'Ingrediente no encontrado en la receta de este negocio' });
    }

    const menuItemId = recipeItem.menuItemId;

    await prisma.recipeItem.delete({ where: { id: parseInt(id) } });

    await degradeIfNeeded(menuItemId, 'invalid_recipe', req.businessId);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el ingrediente', error: error.message });
  }
};

module.exports = {
  getRecipeItems,
  createRecipeItem,
  updateRecipeItem,
  deleteRecipeItem
};
