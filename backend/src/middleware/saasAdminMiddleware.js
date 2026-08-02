const saasAdminMiddleware = (req, res, next) => {
  // El req.user ya fue decodificado por verifyToken
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'No tienes permiso para acceder al panel de administración del SaaS' });
  }
  
  next();
};

module.exports = saasAdminMiddleware;
