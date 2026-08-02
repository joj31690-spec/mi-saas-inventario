const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');

// Obtener todos los usuarios globales (excluyendo ADMIN si se desea, o simplemente todos)
const getGlobalUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        systemRole: {
          not: 'ADMIN'
        }
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
    
    // systemRole por defecto es CEO (basado en schema actual)
    const newUser = await prisma.user.create({
      data: {
        fullName,
        username,
        passwordHash,
        email: email || null,
        phone: phone || null,
        systemRole: 'CEO',
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
