const prisma = require('../prismaClient');
const { businessWhere } = require('../utils/businessHelper');

const getPositions = async (req, res) => {
  try {
    const positions = await prisma.position.findMany({
      where: businessWhere(req),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { assignments: true }
        }
      }
    });

    const enriched = positions.map(pos => {
      const canDelete = pos._count.assignments === 0;
      return {
        ...pos,
        canDelete,
        deleteReason: canDelete ? null : 'has_assignments'
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener puestos', error: error.message });
  }
};

const getPositionById = async (req, res) => {
  try {
    const { id } = req.params;
    const position = await prisma.position.findFirst({
      where: { id: parseInt(id), ...businessWhere(req) },
      include: {
        _count: {
          select: { assignments: true }
        }
      }
    });
    if (!position) return res.status(404).json({ message: 'Puesto no encontrado' });

    const canDelete = position._count.assignments === 0;
    res.json({
      ...position,
      canDelete,
      deleteReason: canDelete ? null : 'has_assignments'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el puesto', error: error.message });
  }
};

const createPosition = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const existing = await prisma.position.findFirst({
      where: { name, ...businessWhere(req) }
    });
    if (existing) return res.status(400).json({ message: 'Ya existe un puesto con ese nombre en este negocio' });

    const newPosition = await prisma.position.create({
      data: {
        businessId: req.businessId,
        name,
        description: description || null,
        isActive: true
      }
    });
    res.status(201).json({ ...newPosition, canDelete: true, deleteReason: null });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el puesto', error: error.message });
  }
};

const updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const existingId = parseInt(id);
    const existing = await prisma.position.findFirst({ where: { id: existingId, ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Puesto no encontrado' });

    const existingName = await prisma.position.findFirst({
      where: { name, id: { not: existingId }, ...businessWhere(req) }
    });
    if (existingName) return res.status(400).json({ message: 'Ya existe otro puesto con ese nombre en este negocio' });

    const updatedPosition = await prisma.position.update({
      where: { id: existingId },
      data: {
        name,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        _count: { select: { assignments: true } }
      }
    });

    const canDelete = updatedPosition._count.assignments === 0;
    res.json({
      ...updatedPosition,
      canDelete,
      deleteReason: canDelete ? null : 'has_assignments'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el puesto', error: error.message });
  }
};

const deletePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const existingId = parseInt(id);
    const existing = await prisma.position.findFirst({ where: { id: existingId, ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Puesto no encontrado' });

    const assignmentsCount = await prisma.employeeAssignment.count({ where: { positionId: existingId } });
    if (assignmentsCount > 0) {
      return res.status(400).json({ message: 'No se puede eliminar el puesto porque tiene empleados asignados' });
    }

    await prisma.position.delete({
      where: { id: existingId }
    });

    res.json({ message: 'Puesto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el puesto', error: error.message });
  }
};

const togglePositionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.position.findFirst({ where: { id: parseInt(id), ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Puesto no encontrado' });

    const newStatus = !existing.isActive;

    const updated = await prisma.position.update({
      where: { id: existing.id },
      data: { isActive: newStatus }
    });

    if (!newStatus) {
      await prisma.employeeAssignment.updateMany({
        where: { positionId: updated.id, isActive: true },
        data: { isActive: false }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar estado del puesto', error: error.message });
  }
};

module.exports = {
  getPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
  togglePositionStatus
};
