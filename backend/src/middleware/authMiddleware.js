const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ message: 'Se requiere un token de autenticación' });
  }

  try {
    const bearerToken = token.split(' ')[1];
    const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

const requireRole = (roleName) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== roleName) {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
    }
    next();
  };
};

const requireBusinessRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.businessRole || !allowedRoles.includes(req.businessRole)) {
      return res.status(403).json({ message: 'No tienes permisos en este negocio para realizar esta acción' });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  requireRole,
  requireBusinessRole,
};
