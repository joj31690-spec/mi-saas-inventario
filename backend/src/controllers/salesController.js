const prisma = require('../prismaClient');
const { resolveIngredientConsumption } = require('../helpers/ingredientResolver');
const { getMenuItemStatus } = require('../helpers/menuHelpers');
const { businessWhere } = require('../utils/businessHelper');

// Obtener cajas disponibles con asignación actual (si la hay)
const getCashRegistersForSale = async (req, res) => {
  try {
    const cashRegisters = await prisma.cashRegister.findMany({
      where: { ...businessWhere(req), isActive: true },
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, fullName: true, username: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    const mapped = cashRegisters.map(cr => {
      const assignment = cr.assignments.length > 0 ? cr.assignments[0] : null;
      return {
        id: cr.id,
        name: cr.name,
        description: cr.description,
        assignedUser: assignment ? assignment.user : null
      };
    });
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cajas', error: error.message });
  }
};

// Historial de ventas
const getSales = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: businessWhere(req),
      include: {
        user: { select: { fullName: true, username: true } },
        cashRegister: { select: { name: true } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial de ventas', error: error.message });
  }
};

// Detalle de una venta
const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findFirst({
      where: { id: parseInt(id), ...businessWhere(req) },
      include: {
        user: { select: { fullName: true, username: true } },
        cashRegister: { select: { name: true } },
        items: {
          include: {
            menuItem: { select: { name: true } }
          }
        }
      }
    });
    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalle de venta', error: error.message });
  }
};

// Transacción compleja: Crear venta y descontar inventario
const createSale = async (req, res) => {
  try {
    const { cashRegisterId, items } = req.body;
    const userId = req.user.id; // Del token

    if (!cashRegisterId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Caja y productos son obligatorios' });
    }

    // Validar caja
    const cr = await prisma.cashRegister.findFirst({
      where: { id: parseInt(cashRegisterId), ...businessWhere(req) }
    });
    if (!cr) return res.status(404).json({ message: 'Caja no encontrada' });

    // Usar transacción de Prisma
    const result = await prisma.$transaction(async (tx) => {
      let total = 0;
      const saleItemsData = [];
      const ingredientConsumptionMap = new Map(); // productId -> amount to deduct

      for (const item of items) {
        const menuItem = await tx.menuItem.findFirst({
          where: { id: parseInt(item.menuItemId), ...businessWhere(req) },
          include: { 
            recipeItems: {
              include: {
                ingredient: {
                  include: {
                    linkedProduct: true,
                    recipeItems: { include: { product: true } }
                  }
                }
              }
            }
          }
        });

        if (!menuItem) {
          throw new Error(`El producto con ID ${item.menuItemId} no existe en este negocio`);
        }

        const statusInfo = await getMenuItemStatus(menuItem.id, tx);
        if (statusInfo.status !== 'Disponible' && menuItem.status !== 'Disponible') {
          throw new Error(`El producto "${menuItem.name}" no está disponible para la venta`);
        }

        const quantity = parseInt(item.quantity);
        if (quantity <= 0) throw new Error('Cantidades deben ser mayores a cero');

        const unitPrice = parseFloat(menuItem.price);
        const subtotal = unitPrice * quantity;
        total += subtotal;

        saleItemsData.push({
          menuItemId: menuItem.id,
          menuItemNameSnapshot: menuItem.name,
          quantity: quantity,
          unitPrice: unitPrice,
          subtotal: subtotal
        });

        if (menuItem.type === 'PREPARADO') {
          if (menuItem.recipeItems.length > 0) {
            for (const recipeItem of menuItem.recipeItems) {
              const consumptionMap = await resolveIngredientConsumption(recipeItem.ingredientId, req.businessId, parseFloat(recipeItem.quantity) * quantity);
              for (const [productId, consumption] of consumptionMap.entries()) {
                const currentTotal = ingredientConsumptionMap.get(productId) || 0;
                ingredientConsumptionMap.set(productId, currentTotal + consumption);
              }
            }
          }
        } else if (menuItem.type === 'REVENTA') {
          if (menuItem.linkedProductId) {
            const currentTotal = ingredientConsumptionMap.get(menuItem.linkedProductId) || 0;
            ingredientConsumptionMap.set(menuItem.linkedProductId, currentTotal + quantity);
          }
        }
      }

      for (const [productId, requiredAmount] of ingredientConsumptionMap.entries()) {
        const product = await tx.product.findFirst({ where: { id: productId, ...businessWhere(req) } });
        if (!product) throw new Error(`El producto de inventario ID ${productId} no existe en este negocio`);
        
        const currentStock = parseFloat(product.currentStock);
        if (currentStock < requiredAmount) {
          throw new Error(`Stock insuficiente para el ingrediente/producto: ${product.name}. Requerido: ${requiredAmount}, Disponible: ${currentStock}`);
        }
      }

      for (const [productId, requiredAmount] of ingredientConsumptionMap.entries()) {
        await tx.product.update({
          where: { id: productId }, // Ya sabemos que pertenece por la validación de arriba
          data: {
            currentStock: { decrement: requiredAmount }
          }
        });
      }

      const user = await tx.user.findUnique({ where: { id: parseInt(userId) } });

      const newSale = await tx.sale.create({
        data: {
          businessId: req.businessId,
          userId: parseInt(userId),
          cashRegisterId: parseInt(cashRegisterId),
          userNameSnapshot: user ? user.fullName : null,
          cashRegisterNameSnapshot: cr.name,
          total: total,
          items: {
            create: saleItemsData
          }
        },
        include: { items: true }
      });

      return newSale;
    });

    res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Eliminar venta
const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    const saleId = parseInt(id);

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, ...businessWhere(req) },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                recipeItems: {
                  include: {
                    ingredient: {
                      include: {
                        linkedProduct: true,
                        recipeItems: { include: { product: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });

    await prisma.$transaction(async (tx) => {
      const ingredientConsumptionMap = new Map();

      // Recalcular consumo para restaurar stock (solo si menuItem aún existe)
      for (const item of sale.items) {
        const menuItem = item.menuItem;
        if (!menuItem) continue; // Si se eliminó el plato del menú, no podemos restaurar su stock exacto fácilmente

        const quantity = parseInt(item.quantity);

        if (menuItem.type === 'PREPARADO') {
          if (menuItem.recipeItems && menuItem.recipeItems.length > 0) {
            for (const recipeItem of menuItem.recipeItems) {
              const consumptionMap = await resolveIngredientConsumption(recipeItem.ingredientId, req.businessId, parseFloat(recipeItem.quantity) * quantity);
              for (const [productId, consumption] of consumptionMap.entries()) {
                const currentTotal = ingredientConsumptionMap.get(productId) || 0;
                ingredientConsumptionMap.set(productId, currentTotal + consumption);
              }
            }
          }
        } else if (menuItem.type === 'REVENTA') {
          if (menuItem.linkedProductId) {
            const currentTotal = ingredientConsumptionMap.get(menuItem.linkedProductId) || 0;
            ingredientConsumptionMap.set(menuItem.linkedProductId, currentTotal + quantity);
          }
        }
      }

      // Restaurar stock
      for (const [productId, amountToRestore] of ingredientConsumptionMap.entries()) {
        const product = await tx.product.findFirst({ where: { id: productId, ...businessWhere(req) } });
        if (product) {
          await tx.product.update({
            where: { id: productId },
            data: { currentStock: { increment: amountToRestore } }
          });
        }
      }

      // Eliminar la venta (Cascada eliminará SaleItem)
      await tx.sale.delete({
        where: { id: saleId }
      });
    });

    res.json({ message: 'Venta eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al limpiar venta', error: error.message });
  }
};

module.exports = {
  getCashRegistersForSale,
  getSales,
  getSaleById,
  createSale,
  deleteSale
};
