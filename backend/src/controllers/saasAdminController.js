const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');

// Obtener métricas globales
const getStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count({
      where: { systemRole: 'CEO', creatorId: null }
    });
    
    const activeUsers = await prisma.user.count({
      where: { systemRole: 'CEO', isActive: true, creatorId: null }
    });
    
    const suspendedUsers = await prisma.user.count({
      where: { systemRole: 'CEO', isActive: false, creatorId: null }
    });
    
    const totalBusinesses = await prisma.business.count();
    
    res.json({
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalBusinesses
    });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo métricas' });
  }
};

// Obtener lista de CEOs con cantidad de negocios
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { systemRole: 'CEO', creatorId: null },
      select: {
        id: true,
        username: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { ownedBusinesses: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Formatear salida para que sea plana
    const formattedUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      isActive: u.isActive,
      createdAt: u.createdAt,
      businessCount: u._count.ownedBusinesses
    }));

    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo usuarios' });
  }
};

// Crear nuevo CEO
const createUser = async (req, res) => {
  try {
    const { username, fullName, password } = req.body;
    
    if (!username || !fullName || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const newUser = await prisma.user.create({
      data: {
        username,
        fullName,
        passwordHash,
        systemRole: 'CEO',
        canManageUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        isActive: true
      },
      select: { id: true, username: true, fullName: true, isActive: true, createdAt: true }
    });
    
    res.status(201).json({ ...newUser, businessCount: 0 });
  } catch (error) {
    res.status(500).json({ message: 'Error creando usuario' });
  }
};

// Editar un CEO
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, fullName, isActive, password } = req.body;
    
    const userToUpdate = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!userToUpdate || userToUpdate.systemRole !== 'CEO') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    if (username && username !== userToUpdate.username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return res.status(400).json({ message: 'El nuevo nombre de usuario ya está en uso' });
      }
    }
    
    const data = {};
    if (username !== undefined) data.username = username;
    if (fullName !== undefined) data.fullName = fullName;
    if (isActive !== undefined) data.isActive = isActive;
    
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    
    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
      select: {
        id: true,
        username: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { ownedBusinesses: true }
        }
      }
    });
    
    res.json({
      id: updated.id,
      username: updated.username,
      fullName: updated.fullName,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      businessCount: updated._count.ownedBusinesses
    });
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando usuario' });
  }
};

// Borrar CEO permanentemente
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user || user.systemRole !== 'CEO') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Al tener onDelete: Cascade en casi todo (y Restrict en business owner),
    // Wait, let's check schema for owner relation.
    // In schema.prisma: owner User @relation("BusinessOwner", fields: [ownerId], references: [id], onDelete: Restrict)
    // Ah, onDelete is Restrict for owner. So deleting the user directly will fail if they own businesses!
    // We must manually delete the businesses first, or change schema to Cascade.
    
    // Borrado manual de negocios en cascada y referencias directas del usuario
    await prisma.$transaction(async (tx) => {
      // 1. Limpiar las referencias donde el usuario actuó pero no es dueño del negocio
      // Esto es crucial porque onDelete: Restrict bloqueará el borrado del usuario
      await tx.businessUser.deleteMany({ where: { userId: parseInt(id) } });
      await tx.employeeAssignment.deleteMany({ where: { userId: parseInt(id) } });
      
      // NOTA: Para ventas, movimientos y gastos, si eliminamos los registros se pierde contabilidad.
      // Pero como el requerimiento actual es un "borrado físico duro", los eliminamos.
      await tx.saleItem.deleteMany({ where: { sale: { userId: parseInt(id) } } });
      await tx.sale.deleteMany({ where: { userId: parseInt(id) } });
      await tx.inventoryMovement.deleteMany({ where: { userId: parseInt(id) } });
      await tx.expense.deleteMany({ where: { userId: parseInt(id) } });

      // 2. Obtener los negocios que posee y limpiar en cascada
      const businesses = await tx.business.findMany({ where: { ownerId: parseInt(id) } });
      const businessIds = businesses.map(b => b.id);
      
      if (businessIds.length > 0) {
        await tx.businessUser.deleteMany({ where: { businessId: { in: businessIds } } });
        await tx.recipeItem.deleteMany({ where: { menuItem: { businessId: { in: businessIds } } } });
        await tx.ingredientRecipe.deleteMany({ where: { ingredient: { businessId: { in: businessIds } } } });
        
        await tx.saleItem.deleteMany({ where: { sale: { businessId: { in: businessIds } } } });
        await tx.sale.deleteMany({ where: { businessId: { in: businessIds } } });
        await tx.inventoryMovement.deleteMany({ where: { businessId: { in: businessIds } } });
        await tx.expense.deleteMany({ where: { businessId: { in: businessIds } } });
        await tx.employeeAssignment.deleteMany({ where: { businessId: { in: businessIds } } });
        
        await tx.menuItem.deleteMany({ where: { businessId: { in: businessIds } } });
        await tx.ingredient.deleteMany({ where: { businessId: { in: businessIds } } });
        await tx.product.deleteMany({ where: { businessId: { in: businessIds } } });
        await tx.position.deleteMany({ where: { businessId: { in: businessIds } } });
        await tx.cashRegister.deleteMany({ where: { businessId: { in: businessIds } } });
        await tx.workShift.deleteMany({ where: { businessId: { in: businessIds } } });
        
        // Finalmente eliminar negocios
        await tx.business.deleteMany({ where: { ownerId: parseInt(id) } });
      }
      
      // 3. Eliminar al usuario
      await tx.user.delete({ where: { id: parseInt(id) } });
    });
    
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error eliminando usuario' });
  }
};

module.exports = {
  getStats,
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
