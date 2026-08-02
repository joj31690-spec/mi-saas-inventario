const prisma = require('../prismaClient');

/**
 * Obtiene el negocio actual completo basado en la request.
 */
const getCurrentBusiness = async (req) => {
  if (!req.businessId) return null;
  return await prisma.business.findUnique({
    where: { id: req.businessId }
  });
};

/**
 * Valida que el usuario tenga un rol específico o superior dentro del negocio activo.
 * Útil para proteger operaciones sumamente críticas (Eliminar negocio, etc.) 
 * aunque ya existan helpers de permisos específicos.
 */
const assertBusinessAccess = (req, allowedRoles) => {
  if (!req.businessRole) {
    throw new Error('No se ha definido un rol en el negocio actual.');
  }

  if (!allowedRoles.includes(req.businessRole)) {
    throw new Error(`Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.`);
  }
};

module.exports = {
  getCurrentBusiness,
  assertBusinessAccess
};
