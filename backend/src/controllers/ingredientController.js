const prisma = require('../prismaClient');
const { validUnits } = require('../constants/units');
const { checkCircularDependency, resolveIngredientCost, resolveIngredientConsumption } = require('../helpers/ingredientResolver');
const { businessWhere } = require('../utils/businessHelper');

const getIngredients = async (req, res) => {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: businessWhere(req),
      include: {
        linkedProduct: true,
        recipeItems: {
          include: {
            product: true,
            childIngredient: true
          }
        },
        menuRecipeItems: { select: { id: true, menuItem: { select: { name: true } } } },
        parentRecipes: { select: { id: true, ingredient: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedIngredients = await Promise.all(ingredients.map(async (ing) => {
      let isAvailable = true;
      if (ing.type === 'DIRECTO') {
        if (!ing.linkedProduct || !ing.linkedProduct.isActive || parseFloat(ing.linkedProduct.currentStock) <= 0) {
          isAvailable = false;
        }
      } else if (ing.type === 'PREPARADO') {
        if (!ing.recipeItems || ing.recipeItems.length === 0) {
          isAvailable = false;
        } else {
          const consumptionMap = await resolveIngredientConsumption(ing.id, req.businessId, 1);
          for (const [productId, requiredAmount] of consumptionMap.entries()) {
            const prod = await prisma.product.findUnique({ where: { id: productId } });
            if (!prod || !prod.isActive || parseFloat(prod.currentStock) <= 0) {
              isAvailable = false;
              break;
            }
          }
        }
      }

      const derivedStatus = isAvailable ? 'Disponible' : 'No disponible';

      if (ing.type === 'PREPARADO') {
        const avgCost = await resolveIngredientCost(ing.id, req.businessId);
        return { ...ing, averageCost: avgCost || 0, derivedStatus };
      }
      return { ...ing, derivedStatus };
    }));

    res.json(enrichedIngredients);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ingredientes', error: error.message });
  }
};

const getIngredientById = async (req, res) => {
  try {
    const { id } = req.params;
    const ingredient = await prisma.ingredient.findFirst({
      where: { id: parseInt(id), ...businessWhere(req) },
      include: {
        linkedProduct: true,
        recipeItems: {
          include: { product: true }
        }
      }
    });
    if (!ingredient) return res.status(404).json({ message: 'Ingrediente no encontrado' });
    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el ingrediente', error: error.message });
  }
};

const createIngredient = async (req, res) => {
  try {
    const { name, description, type, linkedProductId, recipeItems, yieldQuantity, yieldUnit, yieldDescription } = req.body;

    if (type === 'DIRECTO') {
      if (!linkedProductId) {
        return res.status(400).json({ message: 'Un ingrediente DIRECTO requiere un producto de inventario vinculado.' });
      }
      
      // Verificar que el linkedProduct pertenece al negocio
      const product = await prisma.product.findFirst({
        where: { id: parseInt(linkedProductId), ...businessWhere(req) }
      });
      if (!product) return res.status(404).json({ message: 'Producto vinculado no encontrado.' });

      const newIngredient = await prisma.ingredient.create({
        data: {
          businessId: req.businessId,
          name,
          description,
          type,
          linkedProductId: parseInt(linkedProductId),
          isActive: true,
          yieldQuantity: null,
          yieldUnit: null,
          yieldDescription: null
        },
        include: { linkedProduct: true }
      });
      return res.status(201).json(newIngredient);
    } else if (type === 'PREPARADO') {
      if (!recipeItems || recipeItems.length === 0) {
        return res.status(400).json({ message: 'Un ingrediente PREPARADO requiere al menos un ingrediente en su receta.' });
      }
      
      const yq = parseFloat(yieldQuantity);
      if (isNaN(yq) || yq <= 0) {
        return res.status(400).json({ message: 'Un ingrediente PREPARADO requiere un rendimiento del lote mayor a 0.' });
      }

      if (!validUnits.includes(yieldUnit)) {
        return res.status(400).json({ message: 'Unidad de rendimiento inválida.' });
      }

      // Validar que los items de la receta pertenecen al negocio
      for (const item of recipeItems) {
        if (item.productId) {
          const p = await prisma.product.findFirst({ where: { id: parseInt(item.productId), ...businessWhere(req) } });
          if (!p) return res.status(400).json({ message: `Producto ID ${item.productId} no encontrado o no pertenece a este negocio.` });
        }
        if (item.childIngredientId) {
          const ci = await prisma.ingredient.findFirst({ where: { id: parseInt(item.childIngredientId), ...businessWhere(req) } });
          if (!ci) return res.status(400).json({ message: `Ingrediente ID ${item.childIngredientId} no encontrado o no pertenece a este negocio.` });
        }
      }
      
      const newIngredient = await prisma.$transaction(async (tx) => {
        const created = await tx.ingredient.create({
          data: {
            businessId: req.businessId,
            name,
            description,
            type,
            isActive: true,
            yieldQuantity: yq,
            yieldUnit,
            yieldDescription
          }
        });

        if (recipeItems && recipeItems.length > 0) {
          const hasCycle = await checkCircularDependency(created.id, recipeItems, req.businessId);
          if (hasCycle) {
            throw new Error('La receta genera una dependencia circular inválida.');
          }
          await tx.ingredientRecipe.createMany({
            data: recipeItems.map(item => ({
              ingredientId: created.id,
              productId: item.productId ? parseInt(item.productId) : null,
              childIngredientId: item.childIngredientId ? parseInt(item.childIngredientId) : null,
              quantity: parseFloat(item.quantity)
            }))
          });
        }
        return created;
      });

      const finalIngredient = await prisma.ingredient.findUnique({
        where: { id: newIngredient.id },
        include: { recipeItems: { include: { product: true, childIngredient: true } } }
      });
      return res.status(201).json(finalIngredient);
    } else {
      return res.status(400).json({ message: 'Tipo de ingrediente inválido' });
    }
  } catch (error) {
    console.error("Error creating ingredient:", error);
    res.status(500).json({ message: 'Error al crear ingrediente', error: error.message });
  }
};

const updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, type, linkedProductId, recipeItems, yieldQuantity, yieldUnit, yieldDescription } = req.body;
    
    const ingredientId = parseInt(id);

    const existing = await prisma.ingredient.findFirst({ where: { id: ingredientId, ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Ingrediente no encontrado' });

    const newType = type || existing.type;

    if (newType === 'PREPARADO' && recipeItems) {
      for (const item of recipeItems) {
        if (item.productId) {
          const p = await prisma.product.findFirst({ where: { id: parseInt(item.productId), ...businessWhere(req) } });
          if (!p) return res.status(400).json({ message: `Producto ID ${item.productId} no pertenece a este negocio.` });
        }
        if (item.childIngredientId) {
          const ci = await prisma.ingredient.findFirst({ where: { id: parseInt(item.childIngredientId), ...businessWhere(req) } });
          if (!ci) return res.status(400).json({ message: `Ingrediente ID ${item.childIngredientId} no pertenece a este negocio.` });
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      let dataToUpdate = {
        name,
        description,
        isActive,
        type: newType
      };

      if (newType === 'DIRECTO') {
        if (!linkedProductId) {
          throw new Error('Se requiere un producto vinculado para un ingrediente DIRECTO.');
        }
        dataToUpdate.linkedProductId = parseInt(linkedProductId);
        dataToUpdate.yieldQuantity = null;
        dataToUpdate.yieldUnit = null;
        dataToUpdate.yieldDescription = null;
      } else if (newType === 'PREPARADO') {
        dataToUpdate.linkedProductId = null;
        
        if (recipeItems && recipeItems.length === 0) {
          throw new Error('Un ingrediente PREPARADO requiere al menos un ingrediente en su receta.');
        }

        if (recipeItems && recipeItems.length > 0) {
          const hasCycle = await checkCircularDependency(ingredientId, recipeItems, req.businessId);
          if (hasCycle) {
            throw new Error('La receta genera una dependencia circular inválida (ej: A -> B -> A).');
          }
        }

        if (yieldQuantity !== undefined) {
          const yq = parseFloat(yieldQuantity);
          if (isNaN(yq) || yq <= 0) {
            throw new Error('Un ingrediente PREPARADO requiere un rendimiento del lote mayor a 0.');
          }
          dataToUpdate.yieldQuantity = yq;
        }

        if (yieldUnit !== undefined) {
          if (!validUnits.includes(yieldUnit)) {
            throw new Error('Unidad de rendimiento inválida.');
          }
          dataToUpdate.yieldUnit = yieldUnit;
        }

        if (yieldDescription !== undefined) {
          dataToUpdate.yieldDescription = yieldDescription;
        }
      }

      await tx.ingredient.update({
        where: { id: ingredientId },
        data: dataToUpdate
      });

      // Si cambió de PREPARADO a DIRECTO o si es PREPARADO y se enviaron recipeItems, limpiamos recetas previas
      if (existing.type === 'PREPARADO' || newType === 'PREPARADO') {
        if (newType === 'DIRECTO' || (newType === 'PREPARADO' && recipeItems && recipeItems.length > 0)) {
          await tx.ingredientRecipe.deleteMany({
            where: { ingredientId }
          });
        }
      }

      if (newType === 'PREPARADO' && recipeItems && recipeItems.length > 0) {
        await tx.ingredientRecipe.createMany({
          data: recipeItems.map(item => ({
            ingredientId,
            productId: item.productId ? parseInt(item.productId) : null,
            childIngredientId: item.childIngredientId ? parseInt(item.childIngredientId) : null,
            quantity: parseFloat(item.quantity)
          }))
        });
      }

      return await tx.ingredient.findUnique({
        where: { id: ingredientId },
        include: { linkedProduct: true, recipeItems: { include: { product: true, childIngredient: true } } }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating ingredient:", error);
    res.status(500).json({ message: 'Error al actualizar ingrediente', error: error.message });
  }
};

const deleteIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const ingredientId = parseInt(id);

    const existing = await prisma.ingredient.findFirst({ where: { id: ingredientId, ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Ingrediente no encontrado' });

    const inUse = await prisma.recipeItem.findFirst({
      where: { ingredientId: ingredientId, menuItem: businessWhere(req) }
    });
    
    if (inUse) {
      return res.status(400).json({ message: 'No se puede eliminar el ingrediente porque está en uso en una receta de menú.' });
    }

    const inUseAsChild = await prisma.ingredientRecipe.findFirst({
      where: { childIngredientId: ingredientId }
    });

    if (inUseAsChild) {
      return res.status(400).json({ message: 'No se puede eliminar el ingrediente porque se está usando como parte de otro ingrediente preparado.' });
    }

    await prisma.ingredient.delete({
      where: { id: ingredientId }
    });
    res.json({ message: 'Ingrediente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar ingrediente', error: error.message });
  }
};

module.exports = {
  getIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient
};
