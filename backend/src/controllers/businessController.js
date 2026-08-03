const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');
const { assertBusinessAccess } = require('../services/businessService');

const getMyBusinesses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener los negocios donde el usuario tiene algún rol
    const businessUsers = await prisma.businessUser.findMany({
      where: { userId },
      include: {
        business: true
      },
      orderBy: { business: { createdAt: 'desc' } }
    });

    const businesses = businessUsers.map(bu => ({
      id: bu.business.id,
      name: bu.business.name,
      description: bu.business.description,
      logo: bu.business.logo,
      isActive: bu.business.isActive,
      role: bu.role // El rol que tiene en este negocio
    }));

    res.json(businesses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener negocios' });
  }
};

const createBusiness = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, logo } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre del negocio es obligatorio' });
    }

    // Verificar que el usuario tenga permiso para crear negocios (SystemRole == CEO)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user.systemRole !== 'CEO') {
      return res.status(403).json({ message: 'No tienes permiso para crear negocios en la plataforma' });
    }

    let imageUrl = logo || null;
    if (req.file) {
      imageUrl = req.file.path.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`;
    }

    const business = await prisma.business.create({
      data: {
        name,
        description,
        logo: imageUrl,
        ownerId: userId,
        users: {
          create: {
            userId: userId,
            role: 'CEO'
          }
        },
        positions: {
          create: {
            name: 'Administrador',
            description: 'Rol administrativo predeterminado'
          }
        },
        cashRegisters: {
          create: {
            name: 'Caja Principal',
            description: 'Caja principal del local'
          }
        }
      }
    });

    res.status(201).json({
      id: business.id,
      name: business.name,
      description: business.description,
      logo: business.logo,
      role: 'CEO'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear negocio' });
  }
};

const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) !== req.businessId) return res.status(403).json({ message: 'Conflicto de contexto de negocio' });
    
    // Solo un CEO puede modificar la configuración del negocio
    assertBusinessAccess(req, ['CEO']);

    const { name, description, removeImage } = req.body;
    const currentBusiness = await prisma.business.findUnique({ where: { id: parseInt(id) } });
    
    let updatedLogo = currentBusiness.logo;
    if (removeImage === 'true') {
      updatedLogo = null;
    } else if (req.file) {
      updatedLogo = req.file.path.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`;
    }

    const business = await prisma.business.update({
      where: { id: parseInt(id) },
      data: { name, description, logo: updatedLogo }
    });
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar negocio', error: error.message });
  }
};

const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Se requiere la contraseña para eliminar el negocio' });
    }

    const business = await prisma.business.findUnique({
      where: { id: parseInt(id) }
    });

    if (!business) {
      return res.status(404).json({ message: 'Negocio no encontrado' });
    }

    if (business.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Solo el administrador original puede eliminar este negocio' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    await prisma.business.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Negocio eliminado permanentemente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar negocio', error: error.message });
  }
};

const getCurrentBusinessData = async (req, res) => {
  try {
    const businessId = req.businessId; // Proviene del businessMiddleware

    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business || !business.isActive) {
      return res.status(404).json({ message: 'Negocio no encontrado o inactivo' });
    }

    res.json({
      id: business.id,
      name: business.name,
      description: business.description,
      logo: business.logo,
      role: req.businessRole // Proviene del businessMiddleware
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener negocio actual', error: error.message });
  }
};

module.exports = {
  getMyBusinesses,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  getCurrentBusinessData
};
