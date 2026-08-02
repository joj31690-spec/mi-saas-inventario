const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');

// Obtener usuarios del negocio actual
const getUsers = async (req, res) => {
  try {
    const businessUsers = await prisma.businessUser.findMany({
      where: { businessId: req.businessId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            phone: true,
            email: true,
            isActive: true,
            systemRole: true,
            canDeleteUsers: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mapear al formato esperado por el frontend
    const users = businessUsers.map(bu => ({
      ...bu.user,
      businessRoleId: bu.id,
      role: bu.role,
      contractType: bu.contractType,
      baseSalary: bu.baseSalary,
      nextPaymentDate: bu.nextPaymentDate,
      paymentMode: bu.paymentMode
    }));

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios del negocio', error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const businessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: req.businessId,
          userId: parseInt(id)
        }
      },
      include: {
        user: true
      }
    });

    if (!businessUser) return res.status(404).json({ message: 'Usuario no encontrado en este negocio' });
    
    const user = {
      ...businessUser.user,
      role: businessUser.role,
      contractType: businessUser.contractType,
      baseSalary: businessUser.baseSalary,
      nextPaymentDate: businessUser.nextPaymentDate,
      paymentMode: businessUser.paymentMode
    };
    
    // Ocultar hash
    delete user.passwordHash;
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el usuario' });
  }
};

const linkUser = async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    // 1. Verificar si ya está en el negocio
    const existingBusinessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: req.businessId,
          userId: parseInt(userId)
        }
      }
    });

    if (existingBusinessUser) {
      return res.status(400).json({ message: 'El usuario ya pertenece a este negocio' });
    }

    // 2. Vincular al negocio
    const newBusinessUser = await prisma.businessUser.create({
      data: {
        businessId: req.businessId,
        userId: parseInt(userId),
        role: role
      },
      include: {
        user: true
      }
    });

    res.status(201).json({
      id: newBusinessUser.user.id,
      fullName: newBusinessUser.user.fullName,
      username: newBusinessUser.user.username,
      role: newBusinessUser.role,
      isActive: newBusinessUser.user.isActive
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al vincular usuario', error: error.message });
  }
};

const unlinkUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBusinessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: req.businessId,
          userId: parseInt(id)
        }
      }
    });

    if (!existingBusinessUser) {
      return res.status(404).json({ message: 'Usuario no encontrado en este negocio' });
    }

    await prisma.businessUser.delete({
      where: {
        id: existingBusinessUser.id
      }
    });

    res.json({ message: 'Usuario desvinculado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al desvincular usuario', error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'El rol es obligatorio' });
    }

    // Verificar vinculación
    const bu = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: req.businessId,
          userId: parseInt(id)
        }
      }
    });

    if (!bu) {
      return res.status(404).json({ message: 'El usuario no pertenece a este negocio' });
    }

    // Solo actualizar el rol en BusinessUser
    await prisma.businessUser.update({
      where: { id: bu.id },
      data: { role: role }
    });

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Solo desvincular del negocio, no borrar globalmente
    await prisma.businessUser.delete({
      where: {
        businessId_userId: {
          businessId: req.businessId,
          userId: parseInt(id)
        }
      }
    });

    res.json({ message: 'Usuario desvinculado del negocio' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

const updateUserSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const { contractType, baseSalary, nextPaymentDate, paymentMode } = req.body;

    const bu = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: req.businessId,
          userId: parseInt(id)
        }
      }
    });

    if (!bu) {
      return res.status(404).json({ message: 'El usuario no pertenece a este negocio' });
    }

    await prisma.businessUser.update({
      where: { id: bu.id },
      data: {
        contractType: contractType || null,
        baseSalary: baseSalary !== undefined ? baseSalary : null,
        nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : null,
        paymentMode: paymentMode || 'AUTOMATIC'
      }
    });

    res.json({ message: 'Salario configurado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar salario', error: error.message });
  }
};

const calculateNextPaymentDate = (currentDate, contractType) => {
  const date = new Date(currentDate);
  if (contractType === 'Mensual') {
    date.setMonth(date.getMonth() + 1);
  } else if (contractType === 'Quincenal') {
    date.setDate(date.getDate() + 15);
  } else if (contractType === 'Semanal') {
    date.setDate(date.getDate() + 7);
  } else if (contractType === 'Por Día') {
    date.setDate(date.getDate() + 1);
  }
  return date;
};

const payManualSalary = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check CEO
    if (req.businessRole !== 'CEO') {
      return res.status(403).json({ message: 'Solo el CEO puede registrar pagos manuales de salario.' });
    }

    const bu = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: req.businessId,
          userId: parseInt(id)
        }
      },
      include: { user: true }
    });

    if (!bu || bu.paymentMode !== 'MANUAL' || !bu.baseSalary) {
      return res.status(400).json({ message: 'El usuario no está configurado para pago manual o no tiene salario base.' });
    }

    // 1. Crear el Expense
    await prisma.expense.create({
      data: {
        businessId: req.businessId,
        date: new Date(),
        concept: `Pago de salario manual - ${bu.user.fullName}`,
        amount: bu.baseSalary,
        status: 'PAGADO',
        category: 'SALARIOS',
        userId: req.user.id
      }
    });

    // 2. Recalcular nextPaymentDate
    let nextDate = null;
    if (bu.nextPaymentDate && bu.contractType) {
      nextDate = calculateNextPaymentDate(bu.nextPaymentDate, bu.contractType);
    } else {
      nextDate = calculateNextPaymentDate(new Date(), bu.contractType || 'Mensual');
    }

    await prisma.businessUser.update({
      where: { id: bu.id },
      data: { nextPaymentDate: nextDate }
    });

    res.json({ message: 'Pago registrado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar el pago manual', error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  linkUser,
  unlinkUser,
  updateUser,
  updateUserSalary,
  payManualSalary,
  deleteUser,
  calculateNextPaymentDate // export para testing/reutilizar si es necesario
};
