const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');

// Obtener todos los usuarios globales (excluyendo ADMIN si se desea, o simplemente todos)
const getGlobalUsers = async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const envId = currentUser.creatorId || currentUser.id;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: envId },
          { creatorId: envId }
        ]
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        systemRole: true,
        isActive: true,
        canManageUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios globales', error: error.message });
  }
};

// Crear usuario global (solo registro en User)
const createGlobalUser = async (req, res) => {
  try {
    const { fullName, username, password, email, phone, canManageUsers, canEditUsers } = req.body;

    if (!fullName || !username || !password) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const envId = currentUser.creatorId || currentUser.id;

    // systemRole por defecto es CEO (basado en schema actual)
    const newUser = await prisma.user.create({
      data: {
        fullName,
        username,
        passwordHash,
        email: email || null,
        phone: phone || null,
        systemRole: 'CEO',
        creatorId: envId,
        canManageUsers: canManageUsers || false,
        canEditUsers: canEditUsers || false
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        isActive: true,
        canManageUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        createdAt: true
      }
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario global', error: error.message });
  }
};

const updateGlobalUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, username, password, email, phone, isActive, canManageUsers, canEditUsers } = req.body;

    const updateData = {
      fullName,
      username,
      email: email || null,
      phone: phone || null,
    };

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    if (canManageUsers !== undefined) {
      updateData.canManageUsers = canManageUsers;
    }

    if (canEditUsers !== undefined) {
      updateData.canEditUsers = canEditUsers;
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const envId = currentUser.creatorId || currentUser.id;

    const userToUpdate = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!userToUpdate) return res.status(404).json({ message: 'Usuario no encontrado' });
    
    const targetEnvId = userToUpdate.creatorId || userToUpdate.id;
    if (targetEnvId !== envId) {
      return res.status(403).json({ message: 'No tienes permiso para editar este usuario' });
    }

    if (req.user.id !== userToUpdate.id && userToUpdate.creatorId === null) {
      return res.status(403).json({ message: 'No puedes editar al CEO principal' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        isActive: true,
        canManageUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        createdAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario global', error: error.message });
  }
};

const deleteGlobalUser = async (req, res) => {
  try {
    const { id } = req.params;

    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const envId = currentUser.creatorId || currentUser.id;

    const userToDelete = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!userToDelete) return res.status(404).json({ message: 'Usuario no encontrado' });
    
    const targetEnvId = userToDelete.creatorId || userToDelete.id;
    if (targetEnvId !== envId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este usuario' });
    }

    if (userToDelete.creatorId === null) {
      return res.status(403).json({ message: 'No puedes eliminar al CEO principal' });
    }

    // Primero eliminar todas las vinculaciones a negocios
    await prisma.businessUser.deleteMany({
      where: { userId: parseInt(id) }
    });

    // Luego eliminar al usuario
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Usuario global eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario global', error: error.message });
  }
};

module.exports = {
  getGlobalUsers,
  createGlobalUser,
  updateGlobalUser,
  deleteGlobalUser
};
