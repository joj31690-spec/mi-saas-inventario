const prisma = require('../prismaClient');
const { getMenuItemStatus } = require('../helpers/menuHelpers');
const { businessWhere } = require('../utils/businessHelper');

const enrichMenuItem = async (menuItem) => {
  const statusInfo = await getMenuItemStatus(menuItem.id, prisma);
  
  const ingredientsList = menuItem.recipeItems 
    ? menuItem.recipeItems.map(item => ({
        id: item.ingredient ? item.ingredient.id : item.product?.id,
        name: item.ingredient ? item.ingredient.name : item.product?.name,
        quantity: item.quantity,
        unit: item.ingredient?.type === 'DIRECTO' && item.ingredient.linkedProduct ? item.ingredient.linkedProduct.unit : (item.product?.unit || 'Unidad')
      }))
    : [];

  return {
    ...menuItem,
    statusInfo,
    ingredientsList,
  };
};

const getMenuItems = async (req, res) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      where: businessWhere(req),
      include: {
        recipeItems: {
          include: {
            ingredient: {
              include: {
                linkedProduct: true
              }
            }
          }
        },
        linkedProduct: {
          select: { id: true, name: true, currentStock: true, unit: true, isActive: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = await Promise.all(menuItems.map(enrichMenuItem));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener productos del menú', error: error.message });
  }
};

const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: parseInt(id), ...businessWhere(req) },
      include: {
        recipeItems: {
          include: {
            ingredient: {
              include: {
                linkedProduct: true
              }
            }
          }
        },
        linkedProduct: {
          select: { id: true, name: true, currentStock: true, unit: true, isActive: true }
        }
      }
    });

    if (!menuItem) return res.status(404).json({ message: 'Producto del menú no encontrado' });

    const enriched = await enrichMenuItem(menuItem);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el producto del menú' });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, type } = req.body;
    
    if (type === 'REVENTA') {
      return res.status(400).json({ message: 'Los productos de reventa se crean desde el Inventario' });
    }

    if (!name || price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({ message: 'El nombre y precio son obligatorios para productos preparados' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const newMenuItem = await prisma.menuItem.create({
      data: {
        businessId: req.businessId,
        name,
        description,
        price: Number(price),
        status: 'Borrador',
        type: 'PREPARADO',
        imageUrl: imageUrl
      }
    });

    const enriched = await enrichMenuItem(newMenuItem);
    res.status(201).json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el producto del menú', error: error.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, status, removeImage } = req.body;
    const menuItemId = parseInt(id);

    const current = await prisma.menuItem.findFirst({ where: { id: menuItemId, ...businessWhere(req) } });
    if (!current) return res.status(404).json({ message: 'Producto del menú no encontrado' });

    let updatedName = current.name;
    let updatedDescription = current.description;

    if (current.type === 'PREPARADO') {
      if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });
      updatedName = name;
      updatedDescription = description || null;
    }

    if (price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({ message: 'El precio es inválido' });
    }

    let newStatus = status || current.status;
    let newStatusReason = current.statusReason;
    
    let updatedImageUrl = current.imageUrl;
    if (removeImage === 'true') {
      updatedImageUrl = null;
    } else if (req.file && current.type === 'PREPARADO') {
      updatedImageUrl = `/uploads/${req.file.filename}`;
    }

    await prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        name: updatedName,
        description: updatedDescription,
        price: Number(price),
        imageUrl: updatedImageUrl
      }
    });

    if (newStatus === 'Disponible') {
      const statusInfo = await getMenuItemStatus(menuItemId, prisma);
      if (!statusInfo.publishable) {
        return res.status(400).json({
          message: 'No se puede publicar este producto',
          reason: statusInfo.reason
        });
      }
      newStatusReason = null;
    } else if (newStatus === 'No disponible') {
      newStatusReason = 'manual';
    }

    const updated = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        status: newStatus,
        statusReason: newStatusReason
      },
      include: {
        recipeItems: { include: { ingredient: { include: { linkedProduct: true } } } },
        linkedProduct: { select: { id: true, name: true, currentStock: true, unit: true, isActive: true } }
      }
    });

    const enriched = await enrichMenuItem(updated);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el producto del menú', error: error.message });
  }
};

const publishMenuItem = async (req, res) => {
  try {
    const menuItemId = parseInt(req.params.id);

    const existing = await prisma.menuItem.findFirst({ where: { id: menuItemId, ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Producto del menú no encontrado' });

    const statusInfo = await getMenuItemStatus(menuItemId, prisma);
    if (!statusInfo.publishable) {
      return res.status(400).json({
        message: 'No se puede publicar este producto',
        reason: statusInfo.reason
      });
    }

    const updated = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { status: 'Disponible', statusReason: null },
      include: {
        recipeItems: { include: { ingredient: { include: { linkedProduct: true } } } },
        linkedProduct: { select: { id: true, name: true, currentStock: true, unit: true, isActive: true } }
      }
    });

    const enriched = await enrichMenuItem(updated);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error al publicar el producto', error: error.message });
  }
};

const unpublishMenuItem = async (req, res) => {
  try {
    const menuItemId = parseInt(req.params.id);

    const existing = await prisma.menuItem.findFirst({ where: { id: menuItemId, ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Producto del menú no encontrado' });

    const updated = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { status: 'No disponible', statusReason: 'manual' },
      include: {
        recipeItems: { include: { ingredient: { include: { linkedProduct: true } } } },
        linkedProduct: { select: { id: true, name: true, currentStock: true, unit: true, isActive: true } }
      }
    });

    const enriched = await enrichMenuItem(updated);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error al retirar el producto', error: error.message });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const menuItemId = parseInt(req.params.id);

    const existing = await prisma.menuItem.findFirst({ where: { id: menuItemId, ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Producto del menú no encontrado' });

    // Se permite eliminar el producto; el historial de ventas se conserva gracias a menuItemNameSnapshot y onDelete: SetNull en Prisma.

    await prisma.menuItem.delete({ where: { id: menuItemId } });
    res.json({ message: 'Producto del menú eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el producto del menú', error: error.message });
  }
};

module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  publishMenuItem,
  unpublishMenuItem,
  deleteMenuItem
};
