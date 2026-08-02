const prisma = require('../prismaClient');

const businessMiddleware = async (req, res, next) => {
  try {
    const businessId = req.headers['x-business-id'];

    if (!businessId) {
      return res.status(400).json({ message: 'Se requiere el encabezado X-Business-Id' });
    }

    const bId = parseInt(businessId);
    if (isNaN(bId)) {
      return res.status(400).json({ message: 'X-Business-Id debe ser un número válido' });
    }

    // Verificar si el usuario autenticado tiene acceso al negocio
    const businessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: bId,
          userId: req.user.id
        }
      }
    });

    if (!businessUser) {
      // Opcional: si el usuario es ADMIN global, podría acceder a cualquier negocio, pero 
      // el usuario indicó que ADMIN no tiene negocios. Por lo tanto, rechazamos.
      if (req.user.role === 'ADMIN') {
         // O decidir si ADMIN global tiene carta blanca, pero según las reglas, solo CEO puede.
         // Lo mantenemos estricto: debes existir en BusinessUser.
      }
      return res.status(403).json({ message: 'No tienes acceso a este negocio' });
    }

    // Inyectamos el ID y el rol del negocio para que los controladores lo usen
    req.businessId = bId;
    req.businessRole = businessUser.role;

    next();
  } catch (error) {
    console.error('Error en businessMiddleware:', error);
    res.status(500).json({ message: 'Error interno de validación de negocio' });
  }
};

module.exports = businessMiddleware;
