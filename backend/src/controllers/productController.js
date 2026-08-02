const prisma = require('../prismaClient');
const { validUnits } = require('../constants/units');
const { businessWhere } = require('../utils/businessHelper');

const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: businessWhere(req),
      orderBy: { createdAt: 'desc' },
      include: {
        movements: {
          where: { type: 'ENTRY', cost: { not: null } }
        }
      }
    });
    
    const enrichedProducts = products.map(p => {
      let status = 'Disponible';
      let statusCode = 'AVAILABLE';
      
      const curr = Number(p.currentStock);
      const min = Number(p.minimumStock);
      
      if (!p.isActive) {
        status = 'No disponible';
        statusCode = 'INACTIVE';
      } else if (curr === 0) {
        status = 'Agotado';
        statusCode = 'OUT_OF_STOCK';
      } else if (curr <= min) {
        status = 'Stock bajo';
        statusCode = 'LOW_STOCK';
      }
      
      let avgCost = null;
      if (p.movements && p.movements.length > 0) {
        let sumC = 0, sumQ = 0;
        p.movements.forEach(m => {
          sumC += parseFloat(m.cost);
          sumQ += parseFloat(m.quantity);
        });
        if (sumQ > 0) avgCost = sumC / sumQ;
      }
      
      const { movements, ...rest } = p;
      return {
        ...rest,
        status,
        statusCode,
        averageCost: avgCost
      };
    });

    res.json(enrichedProducts);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener productos', error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findFirst({ 
      where: { id: parseInt(id), ...businessWhere(req) } 
    });
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el producto' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, category, unit, minimumStock } = req.body;
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!validUnits.includes(unit)) {
      return res.status(400).json({ message: 'Unidad de medida inválida' });
    }

    const newProduct = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          businessId: req.businessId,
          name,
          description,
          category,
          unit,
          currentStock: 0,
          minimumStock: parseFloat(minimumStock) || 0,
          imageUrl: imageUrl
        }
      });

      if (category === 'REVENTA') {
        await tx.menuItem.create({
          data: {
            businessId: req.businessId,
            name: p.name,
            description: p.description,
            type: 'REVENTA',
            status: 'Borrador',
            price: null,
            linkedProductId: p.id,
            imageUrl: imageUrl
          }
        });
      }

      return p;
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, description, category, unit, minimumStock, isActive, removeImage } = req.body;
    
    // Si viene desde FormData, booleanos pueden venir como strings 'true'/'false'
    if (typeof isActive === 'string') {
      isActive = isActive === 'true';
    }

    if (unit && !validUnits.includes(unit)) {
      return res.status(400).json({ message: 'Unidad de medida inválida' });
    }

    const productId = parseInt(id);

    // Verificar propiedad
    const existing = await prisma.product.findFirst({ where: { id: productId, ...businessWhere(req) }});
    if (!existing) return res.status(404).json({ message: 'Producto no encontrado' });

    const updatedProduct = await prisma.$transaction(async (tx) => {
      if (isActive === false) {
        const affectedDirect = await tx.ingredient.findMany({ where: { linkedProductId: productId, ...businessWhere(req) }, select: { id: true } });
        const affectedPrep = await tx.ingredientRecipe.findMany({ where: { productId, ingredient: businessWhere(req) }, select: { ingredientId: true } });
        
        const affectedIngredientIds = [
          ...affectedDirect.map(i => i.id),
          ...affectedPrep.map(i => i.ingredientId)
        ];

        if (affectedIngredientIds.length > 0) {
          const affectedRecipeItems = await tx.recipeItem.findMany({
            where: { ingredientId: { in: affectedIngredientIds }, menuItem: businessWhere(req) },
            select: { menuItemId: true }
          });
          const affectedMenuItemIds = [...new Set(affectedRecipeItems.map(ri => ri.menuItemId))];
          if (affectedMenuItemIds.length > 0) {
            await tx.menuItem.updateMany({
              where: { id: { in: affectedMenuItemIds }, status: 'Disponible', ...businessWhere(req) },
              data: { status: 'No disponible', statusReason: 'inactive_ingredient' }
            });
          }
        }

        await tx.menuItem.updateMany({
          where: { linkedProductId: productId, type: 'REVENTA', status: 'Disponible', ...businessWhere(req) },
          data: { status: 'No disponible', statusReason: 'inactive_ingredient' }
        });
      }

      const dataToUpdate = {
        name,
        description,
        category,
        unit,
        minimumStock: minimumStock !== undefined ? parseFloat(minimumStock) : undefined,
      };

      if (isActive !== undefined) {
        dataToUpdate.isActive = isActive;
      }
      if (removeImage === 'true') {
        dataToUpdate.imageUrl = null;
      } else if (req.file) {
        dataToUpdate.imageUrl = `/uploads/${req.file.filename}`;
      }

      const p = await tx.product.update({
        where: { id: productId },
        data: dataToUpdate
      });

      const linkedMenu = await tx.menuItem.findUnique({ where: { linkedProductId: productId } });
      
      if (p.category === 'REVENTA' && !linkedMenu) {
        await tx.menuItem.create({
          data: {
            businessId: req.businessId,
            name: p.name,
            description: p.description,
            type: 'REVENTA',
            status: 'Borrador',
            price: null,
            linkedProductId: p.id,
            imageUrl: dataToUpdate.imageUrl
          }
        });
      } else if (linkedMenu && p.category === 'REVENTA') {
        const menuUpdateData = { name: p.name, description: p.description };
        if (dataToUpdate.imageUrl !== undefined) {
          menuUpdateData.imageUrl = dataToUpdate.imageUrl;
        } else if (removeImage === 'true') {
          menuUpdateData.imageUrl = null;
        }
        await tx.menuItem.update({
          where: { linkedProductId: productId },
          data: menuUpdateData
        });
      } else if (linkedMenu && p.category === 'INSUMO') {
        await tx.menuItem.delete({ where: { linkedProductId: productId } });
      }

      return p;
    });

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
};

const getDeactivationImpact = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    const existing = await prisma.product.findFirst({ where: { id: productId, ...businessWhere(req) }});
    if (!existing) return res.status(404).json({ message: 'Producto no encontrado' });

    const affectedDirect = await prisma.ingredient.findMany({ where: { linkedProductId: productId, ...businessWhere(req) }, select: { id: true } });
    const affectedPrep = await prisma.ingredientRecipe.findMany({ where: { productId, ingredient: businessWhere(req) }, select: { ingredientId: true } });
    
    const affectedIngredientIds = [
      ...affectedDirect.map(i => i.id),
      ...affectedPrep.map(i => i.ingredientId)
    ];

    let affectedMenuItems = [];

    if (affectedIngredientIds.length > 0) {
      const affectedRecipeItems = await prisma.recipeItem.findMany({
        where: { ingredientId: { in: affectedIngredientIds }, menuItem: businessWhere(req) },
        select: { menuItem: { select: { id: true, name: true, status: true, type: true } } }
      });

      affectedMenuItems = affectedRecipeItems
        .map(ri => ri.menuItem)
        .filter(mi => mi.status === 'Disponible');
    }

    const linkedMenu = await prisma.menuItem.findUnique({
      where: { linkedProductId: productId },
      select: { id: true, name: true, status: true, type: true }
    });

    if (linkedMenu && linkedMenu.status === 'Disponible') {
      affectedMenuItems.push(linkedMenu);
    }

    const unique = [...new Map(affectedMenuItems.map(mi => [mi.id, mi])).values()];

    res.json({ count: unique.length, menuItems: unique });
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular impacto', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const existing = await prisma.product.findFirst({ where: { id: productId, ...businessWhere(req) }});
    if (!existing) return res.status(404).json({ message: 'Producto no encontrado' });

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated direct ingredient and its recipe relations
      const directIngredient = await tx.ingredient.findFirst({ where: { linkedProductId: productId } });
      if (directIngredient) {
        await tx.recipeItem.deleteMany({ where: { ingredientId: directIngredient.id } });
        await tx.ingredientRecipe.deleteMany({ where: { childIngredientId: directIngredient.id } });
        await tx.ingredientRecipe.deleteMany({ where: { ingredientId: directIngredient.id } });
        await tx.ingredient.delete({ where: { id: directIngredient.id } });
      }

      // 2. Delete any IngredientRecipe that uses this product
      await tx.ingredientRecipe.deleteMany({ where: { productId: productId } });

      // 3. Delete linked MenuItem if it exists
      const linkedMenu = await tx.menuItem.findUnique({ where: { linkedProductId: productId } });
      if (linkedMenu) {
        await tx.recipeItem.deleteMany({ where: { menuItemId: linkedMenu.id } });
        await tx.menuItem.delete({ where: { id: linkedMenu.id } });
      }

      // 4. Finally delete the Product
      await tx.product.delete({ where: { id: productId } });
    });

    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
  }
};

const stockEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, cost, reason, supplier } = req.body;
    
    const userId = req.user?.id; 
    
    const existing = await prisma.product.findFirst({ where: { id: parseInt(id), ...businessWhere(req) }});
    if (!existing) return res.status(404).json({ message: 'Producto no encontrado' });

    const q = parseFloat(quantity);
    if (isNaN(q) || q <= 0) return res.status(400).json({ message: 'Cantidad inválida' });

    const product = await prisma.$transaction(async (tx) => {
      const updatedP = await tx.product.update({
        where: { id: parseInt(id) },
        data: {
          currentStock: { increment: q }
        }
      });

      await tx.inventoryMovement.create({
        data: {
          businessId: req.businessId,
          productId: updatedP.id,
          userId,
          type: 'ENTRY',
          quantity: q,
          cost: cost !== undefined && cost !== null ? parseFloat(cost) : null,
          reason,
          supplier
        }
      });

      return updatedP;
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar entrada de stock', error: error.message });
  }
};

const stockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const { newStock, reason } = req.body;
    
    const userId = req.user?.id;

    const existing = await prisma.product.findFirst({ where: { id: parseInt(id), ...businessWhere(req) }});
    if (!existing) return res.status(404).json({ message: 'Producto no encontrado' });

    const targetStock = parseFloat(newStock);
    if (isNaN(targetStock) || targetStock < 0) return res.status(400).json({ message: 'Nuevo stock inválido' });

    const product = await prisma.$transaction(async (tx) => {
      const diff = targetStock - parseFloat(existing.currentStock);

      const updatedP = await tx.product.update({
        where: { id: existing.id },
        data: {
          currentStock: targetStock
        }
      });

      if (diff !== 0) {
        const user = userId ? await tx.user.findUnique({ where: { id: userId } }) : null;
        await tx.inventoryMovement.create({
          data: {
            businessId: req.businessId,
            productId: updatedP.id,
            productNameSnapshot: updatedP.name,
            productCategorySnapshot: updatedP.category,
            userNameSnapshot: user ? user.fullName : null,
            userId,
            type: 'ADJUSTMENT',
            quantity: diff,
            cost: null,
            reason
          }
        });
      }

      return updatedP;
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar ajuste de stock', error: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getDeactivationImpact,
  stockEntry,
  stockAdjustment
};
