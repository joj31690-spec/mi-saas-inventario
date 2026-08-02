const getRoles = async (req, res) => {
  try {
    // Retornamos los roles de negocio disponibles en la plataforma (Visualmente renombrados)
    const roles = [
      { id: 'CEO', name: 'Administrador' },
      { id: 'GERENTE', name: 'Encargado' },
      { id: 'EMPLEADO', name: 'Personal' }
    ];
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener roles', error: error.message });
  }
};

module.exports = {
  getRoles
};
