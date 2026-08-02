// Equivalente al permissions.js del backend para uso en la interfaz (desacoplado)

export const canManageMenu = (role) => {
  return ['CEO', 'GERENTE'].includes(role);
};

export const canManageEmployees = (role) => {
  return ['CEO', 'GERENTE'].includes(role);
};

export const canSeeFinance = (role) => {
  return ['CEO', 'GERENTE', 'AUDITOR'].includes(role);
};

export const canManageInventory = (role) => {
  return ['CEO', 'GERENTE', 'ENCARGADO_INVENTARIO'].includes(role);
};

export const canRegisterSales = (role) => {
  return ['CEO', 'GERENTE', 'CAJERO'].includes(role);
};
