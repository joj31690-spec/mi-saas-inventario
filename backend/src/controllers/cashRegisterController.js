const prisma = require('../prismaClient');
const { businessWhere } = require('../utils/businessHelper');

const getCashRegisters = async (req, res) => {
  try {
    const cashRegisters = await prisma.cashRegister.findMany({
      where: businessWhere(req),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { sales: true }
        }
      }
    });

    const enriched = cashRegisters.map(c => {
      const canDelete = c._count.sales === 0;
      return {
        ...c,
        canDelete,
        deleteReason: canDelete ? null : 'has_sales'
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cajas', error: error.message });
  }
};

const getCashRegisterById = async (req, res) => {
  try {
    const { id } = req.params;
    const cashRegister = await prisma.cashRegister.findFirst({
      where: { id: parseInt(id), ...businessWhere(req) },
      include: {
        _count: { select: { sales: true } }
      }
    });
    if (!cashRegister) return res.status(404).json({ message: 'Caja no encontrada' });

    const canDelete = cashRegister._count.sales === 0;
    res.json({
      ...cashRegister,
      canDelete,
      deleteReason: canDelete ? null : 'has_sales'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la caja', error: error.message });
  }
};

const createCashRegister = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    // Verificar unicidad del nombre por negocio
    const existing = await prisma.cashRegister.findFirst({
      where: { name, ...businessWhere(req) }
    });
    if (existing) return res.status(400).json({ message: 'Ya existe una caja con ese nombre en este negocio' });

    const newCashRegister = await prisma.cashRegister.create({
      data: {
        businessId: req.businessId,
        name,
        description: description || null,
        isActive: true
      }
    });
    res.status(201).json({ ...newCashRegister, canDelete: true, deleteReason: null });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la caja', error: error.message });
  }
};

const updateCashRegister = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const existingId = parseInt(id);
    const cash = await prisma.cashRegister.findFirst({ where: { id: existingId, ...businessWhere(req) } });
    if (!cash) return res.status(404).json({ message: 'Caja no encontrada' });

    // Verificar unicidad de nombre (excluyendo el actual)
    const existingName = await prisma.cashRegister.findFirst({
      where: { name, id: { not: existingId }, ...businessWhere(req) }
    });
    if (existingName) return res.status(400).json({ message: 'Ya existe otra caja con ese nombre en este negocio' });

    const updatedCashRegister = await prisma.cashRegister.update({
      where: { id: existingId },
      data: {
        name,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        _count: { select: { sales: true } }
      }
    });

    const canDelete = updatedCashRegister._count.sales === 0;
    res.json({
      ...updatedCashRegister,
      canDelete,
      deleteReason: canDelete ? null : 'has_sales'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la caja', error: error.message });
  }
};

const deleteCashRegister = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingId = parseInt(id);
    const cash = await prisma.cashRegister.findFirst({ where: { id: existingId, ...businessWhere(req) } });
    if (!cash) return res.status(404).json({ message: 'Caja no encontrada' });

    const salesCount = await prisma.sale.count({ where: { cashRegisterId: existingId } }); // Ya pertenece a la caja verificada
    
    if (salesCount > 0) {
      return res.status(400).json({ message: 'No se puede eliminar la caja porque tiene ventas registradas' });
    }

    await prisma.cashRegister.delete({
      where: { id: existingId }
    });

    res.json({ message: 'Caja eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la caja', error: error.message });
  }
};

const toggleCashRegisterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.cashRegister.findFirst({ where: { id: parseInt(id), ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Caja no encontrada' });

    const newStatus = !existing.isActive;

    const updated = await prisma.cashRegister.update({
      where: { id: existing.id },
      data: { isActive: newStatus }
    });

    if (!newStatus) {
      await prisma.employeeAssignment.updateMany({
        where: { cashRegisterId: updated.id, isActive: true },
        data: { isActive: false }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar estado de la caja', error: error.message });
  }
};

module.exports = {
  getCashRegisters,
  getCashRegisterById,
  createCashRegister,
  updateCashRegister,
  deleteCashRegister,
  toggleCashRegisterStatus
};
