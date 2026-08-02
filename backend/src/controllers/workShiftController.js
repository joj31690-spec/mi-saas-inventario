const prisma = require('../prismaClient');
const { businessWhere } = require('../utils/businessHelper');

const getWorkShifts = async (req, res) => {
  try {
    const shifts = await prisma.workShift.findMany({
      where: businessWhere(req),
      orderBy: { createdAt: 'desc' }
    });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener jornadas', error: error.message });
  }
};

const getWorkShiftById = async (req, res) => {
  try {
    const shift = await prisma.workShift.findFirst({
      where: { id: parseInt(req.params.id), ...businessWhere(req) }
    });
    if (!shift) return res.status(404).json({ message: 'Jornada no encontrada' });
    res.json(shift);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener jornada', error: error.message });
  }
};

const validateTimes = (data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Las horas de inicio y fin son inválidas');
  }

  if (start.getTime() === end.getTime()) {
    throw new Error('La hora de entrada y salida no pueden ser exactamente iguales');
  }

  let durationMs = end.getTime() - start.getTime();
  if (durationMs < 0) {
    durationMs += 24 * 60 * 60 * 1000;
  }

  const durationHours = durationMs / (1000 * 60 * 60);
  if (durationHours > 16) {
    throw new Error('La jornada no puede exceder las 16 horas de duración');
  }
  if (durationHours < 1) {
    throw new Error('La jornada debe durar al menos 1 hora');
  }

  if ((data.breakStartTime && !data.breakEndTime) || (!data.breakStartTime && data.breakEndTime)) {
    throw new Error('El descanso debe tener inicio y fin, o estar completamente vacío');
  }

  if (data.breakStartTime && data.breakEndTime) {
    const bStart = new Date(data.breakStartTime);
    const bEnd = new Date(data.breakEndTime);
    if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) {
      throw new Error('Las horas de descanso son inválidas');
    }
    if (bStart.getTime() === bEnd.getTime()) {
      throw new Error('El inicio y fin del descanso no pueden ser iguales');
    }
    
    let breakDurationMs = bEnd.getTime() - bStart.getTime();
    if (breakDurationMs < 0) breakDurationMs += 24 * 60 * 60 * 1000;
    
    if (breakDurationMs >= durationMs) {
      throw new Error('El descanso no puede ser mayor o igual a la duración de la jornada');
    }
  }
};

const createWorkShift = async (req, res) => {
  try {
    validateTimes(req.body);
    
    // Validar nombre único en el negocio
    const existing = await prisma.workShift.findFirst({
      where: { name: req.body.name, ...businessWhere(req) }
    });
    if (existing) return res.status(400).json({ message: 'Ya existe una jornada con ese nombre en este negocio' });

    const shift = await prisma.workShift.create({
      data: {
        ...req.body,
        businessId: req.businessId
      }
    });
    res.status(201).json(shift);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error al crear jornada' });
  }
};

const updateWorkShift = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.workShift.findFirst({ where: { id, ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Jornada no encontrada' });

    validateTimes(req.body);

    const existingName = await prisma.workShift.findFirst({
      where: { name: req.body.name, id: { not: id }, ...businessWhere(req) }
    });
    if (existingName) return res.status(400).json({ message: 'Ya existe otra jornada con ese nombre en este negocio' });

    const shift = await prisma.workShift.update({
      where: { id },
      data: req.body
    });

    if (req.body.isActive === false) {
      await prisma.employeeAssignment.updateMany({
        where: { workShiftId: shift.id, isActive: true },
        data: { isActive: false }
      });
    }

    res.json(shift);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error al actualizar jornada' });
  }
};

const deleteWorkShift = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.workShift.findFirst({ where: { id, ...businessWhere(req) } });
    if (!existing) return res.status(404).json({ message: 'Jornada no encontrada' });

    const assignments = await prisma.employeeAssignment.count({
      where: { workShiftId: id } // El assignment ya debe estar vinculado, pero es seguro.
    });

    if (assignments > 0) {
      return res.status(400).json({ message: 'No se puede eliminar la jornada porque tiene empleados asignados' });
    }

    await prisma.workShift.delete({ where: { id } });
    res.json({ message: 'Jornada eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar jornada', error: error.message });
  }
};

module.exports = {
  getWorkShifts,
  getWorkShiftById,
  createWorkShift,
  updateWorkShift,
  deleteWorkShift
};
