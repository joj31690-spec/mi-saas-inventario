// Helper para evaluar permisos basados en el rol del negocio (BusinessRole)
const permissions = {
  canManageBusiness: (role) => role === 'CEO',
  canManageEmployees: (role) => ['CEO', 'GERENTE'].includes(role),
  canSeeFinance: (role) => ['CEO', 'GERENTE'].includes(role),
  canManageInventory: (role) => ['CEO', 'GERENTE'].includes(role),
  canManageMenu: (role) => ['CEO', 'GERENTE'].includes(role),
  canRegisterSales: (role) => ['CEO', 'GERENTE', 'CAJERO'].includes(role),
  canOpenCashRegister: (role) => ['CEO', 'GERENTE', 'CAJERO'].includes(role),
  canRegisterAttendance: (role) => ['CEO', 'GERENTE', 'CAJERO', 'EMPLEADO'].includes(role),
};

const requirePermission = (permissionFn) => {
  return (req, res, next) => {
    if (!req.businessRole || !permissionFn(req.businessRole)) {
      return res.status(403).json({ message: 'No tienes permisos suficientes en este negocio para realizar esta acción' });
    }
    next();
  };
};

module.exports = {
  permissions,
  requirePermission
};
