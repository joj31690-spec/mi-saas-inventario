const prisma = require('../prismaClient');
const { businessWhere } = require('../utils/businessHelper');

const getInventoryMovements = async (req, res) => {
  try {
    const { productId, type } = req.query;
    const whereClause = { ...businessWhere(req) };
    
    if (productId) whereClause.productId = parseInt(productId);
    if (type) whereClause.type = type;
    else if (!productId) whereClause.type = 'ENTRY'; // Comportamiento por defecto para la pestaña de compras

    const movements = await prisma.inventoryMovement.findMany({
      where: whereClause,
      include: {
        product: { select: { name: true, unit: true } },
        user: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener movimientos', error: error.message });
  }
};

const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the movement
    const movement = await prisma.inventoryMovement.findUnique({
      where: { id: Number(id) }
    });

    if (!movement) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    // Verify it belongs to the business
    if (movement.businessId !== req.businessId) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Verify it is an ENTRY
    if (movement.type !== 'ENTRY') {
      return res.status(400).json({ message: 'Solo se pueden eliminar movimientos de entrada (compras)' });
    }

    // Revert stock if the product exists
    if (movement.productId) {
      const product = await prisma.product.findUnique({ where: { id: movement.productId } });
      if (product) {
        const currentStock = parseFloat(product.currentStock);
        const qtyToRevert = parseFloat(movement.quantity);
        const newStock = Math.max(0, currentStock - qtyToRevert);

        await prisma.product.update({
          where: { id: product.id },
          data: { currentStock: newStock }
        });
      }
    }

    // Delete the movement
    await prisma.inventoryMovement.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Compra limpiada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al limpiar la compra', error: error.message });
  }
};

module.exports = {
  getInventoryMovements,
  deletePurchase
};
