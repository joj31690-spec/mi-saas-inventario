const prisma = require('../prismaClient');
const { businessWhere } = require('../utils/businessHelper');

const getAssignments = async (req, res) => {
  try {
    const assignments = await prisma.employeeAssignment.findMany({
      where: businessWhere(req),
      include: {
        user: { select: { id: true, username: true, fullName: true, isActive: true } },
        position: { select: { id: true, name: true, isActive: true, description: true } },
        cashRegister: { select: { id: true, name: true, isActive: true, description: true } },
        workShift: { select: { id: true, name: true, color: true, startTime: true, endTime: true, isActive: true, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true, breakStartTime: true, breakEndTime: true, toleranceMinutes: true, observations: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = assignments.map(a => {
      const canDelete = true;
      let nextPaymentDate = null;
      if (a.salaryStartDate && a.salaryType) {
        nextPaymentDate = calculateNextPaymentDate(new Date(a.salaryStartDate), a.salaryType);
      }
      return {
        ...a,
        canDelete,
        deleteReason: canDelete ? null : 'future_relation',
        nextPaymentDate
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener asignaciones', error: error.message });
  }
};

const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await prisma.employeeAssignment.findFirst({
      where: { id: parseInt(id), ...businessWhere(req) },
      include: {
        user: { select: { id: true, username: true, fullName: true } },
        position: { select: { id: true, name: true, description: true } },
        cashRegister: { select: { id: true, name: true, description: true } },
        workShift: { select: { id: true, name: true, color: true, startTime: true, endTime: true, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true, breakStartTime: true, breakEndTime: true, toleranceMinutes: true, observations: true } }
      }
    });
    if (!assignment) return res.status(404).json({ message: 'Asignación no encontrada' });

    const canDelete = true;
    let nextPaymentDate = null;
    if (assignment.salaryStartDate && assignment.salaryType) {
      nextPaymentDate = calculateNextPaymentDate(new Date(assignment.salaryStartDate), assignment.salaryType);
    }
    res.json({
      ...assignment,
      canDelete,
      deleteReason: canDelete ? null : 'future_relation',
      nextPaymentDate
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la asignación', error: error.message });
  }
};

const calculateNextPaymentDate = (startDate, type) => {
  const now = new Date();
  
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (today < startDay) return startDate;

  const next = new Date(startDate);
  
  if (type === 'Mensual') {
    const monthsPassed = (today.getFullYear() - startDay.getFullYear()) * 12 + (today.getMonth() - startDay.getMonth());
    next.setMonth(next.getMonth() + monthsPassed);
    if (next <= today) {
      next.setMonth(next.getMonth() + 1);
    }
  } else if (type === 'Semanal') {
    const diffTime = Math.abs(today - startDay);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weeksPassed = Math.floor(diffDays / 7);
    next.setDate(next.getDate() + weeksPassed * 7);
    if (next <= today) {
      next.setDate(next.getDate() + 7);
    }
  } else if (type === 'Diario' || type === 'Por hora') {
    if (startDay <= today) {
      next.setFullYear(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    }
  }
  
  return next;
};

const createAssignment = async (req, res) => {
  try {
    const { userId, positionId, cashRegisterId, workShiftId, extraPayForShift, startDate } = req.body;
    
    if (!userId || !positionId || !workShiftId) {
      return res.status(400).json({ message: 'Usuario, Puesto y Jornada son obligatorios' });
    }

    // Validar relaciones de negocio
    const [userAssigned, position, shift, cashRegister] = await Promise.all([
      prisma.businessUser.findFirst({ where: { userId: parseInt(userId), ...businessWhere(req) } }),
      prisma.position.findFirst({ where: { id: parseInt(positionId), ...businessWhere(req) } }),
      prisma.workShift.findFirst({ where: { id: parseInt(workShiftId), ...businessWhere(req) } }),
      cashRegisterId ? prisma.cashRegister.findFirst({ where: { id: parseInt(cashRegisterId), ...businessWhere(req) } }) : Promise.resolve(null)
    ]);

    if (!userAssigned) return res.status(400).json({ message: 'El usuario no pertenece a este negocio' });
    if (!position) return res.status(400).json({ message: 'El puesto no pertenece a este negocio' });
    if (!shift) return res.status(400).json({ message: 'La jornada no pertenece a este negocio' });
    if (cashRegisterId && !cashRegister) return res.status(400).json({ message: 'La caja no pertenece a este negocio' });

    let parsedStartDate = undefined;
    if (startDate) {
      parsedStartDate = new Date(`${startDate}T00:00:00Z`);
    }

    const newAssignment = await prisma.employeeAssignment.create({
      data: {
        businessId: req.businessId,
        userId: parseInt(userId),
        positionId: parseInt(positionId),
        cashRegisterId: cashRegisterId ? parseInt(cashRegisterId) : null,
        workShiftId: parseInt(workShiftId),
        extraPayForShift: extraPayForShift ? parseFloat(extraPayForShift) : null,
        startDate: parsedStartDate,
        isActive: true
      }
    });

    res.status(201).json({ ...newAssignment, canDelete: true, deleteReason: null });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la asignación', error: error.message });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    let { userId, positionId, cashRegisterId, workShiftId, extraPayForShift, isActive, startDate } = req.body;

    const existingId = parseInt(id);
    const existingAssignment = await prisma.employeeAssignment.findFirst({ where: { id: existingId, ...businessWhere(req) } });
    
    if (!existingAssignment) return res.status(404).json({ message: 'Asignación no encontrada' });

    if (userId) {
      const u = await prisma.businessUser.findFirst({ where: { userId: parseInt(userId), ...businessWhere(req) } });
      if (!u) return res.status(400).json({ message: 'El usuario no pertenece a este negocio' });
    }
    if (positionId) {
      const pos = await prisma.position.findFirst({ where: { id: parseInt(positionId), ...businessWhere(req) } });
      if (!pos) return res.status(400).json({ message: 'El puesto no pertenece a este negocio' });
    }
    if (workShiftId) {
      const sh = await prisma.workShift.findFirst({ where: { id: parseInt(workShiftId), ...businessWhere(req) } });
      if (!sh) return res.status(400).json({ message: 'La jornada no pertenece a este negocio' });
    }
    if (cashRegisterId) {
      const cr = await prisma.cashRegister.findFirst({ where: { id: parseInt(cashRegisterId), ...businessWhere(req) } });
      if (!cr) return res.status(400).json({ message: 'La caja no pertenece a este negocio' });
    }

    if (req.businessRole === 'GERENTE') {
      extraPayForShift = undefined;
    }

    let parsedStartDate = undefined;
    if (startDate) {
      parsedStartDate = new Date(`${startDate}T00:00:00Z`);
    }

    const updatedAssignment = await prisma.employeeAssignment.update({
      where: { id: existingId },
      data: {
        userId: userId ? parseInt(userId) : existingAssignment.userId,
        positionId: positionId ? parseInt(positionId) : existingAssignment.positionId,
        cashRegisterId: cashRegisterId !== undefined ? (cashRegisterId ? parseInt(cashRegisterId) : null) : existingAssignment.cashRegisterId,
        workShiftId: workShiftId !== undefined ? (workShiftId ? parseInt(workShiftId) : null) : existingAssignment.workShiftId,
        extraPayForShift: extraPayForShift !== undefined ? (extraPayForShift ? parseFloat(extraPayForShift) : null) : existingAssignment.extraPayForShift,
        isActive: isActive !== undefined ? isActive : existingAssignment.isActive,
        startDate: parsedStartDate || existingAssignment.startDate
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, isActive: true } },
        position: { select: { id: true, name: true, isActive: true } },
        cashRegister: { select: { id: true, name: true, isActive: true } },
        workShift: { select: { id: true, name: true, color: true, startTime: true, endTime: true, isActive: true } }
      }
    });

    res.json(updatedAssignment);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la asignación', error: error.message });
  }
};

const getActiveAssignment = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const nowTime = now.getHours() * 60 + now.getMinutes();
    
    const assignments = await prisma.employeeAssignment.findMany({
      where: {
        userId: userId,
        isActive: true,
        ...businessWhere(req)
      },
      include: {
        workShift: true,
        position: true,
        cashRegister: true
      }
    });
    
    if (assignments.length === 0) {
      return res.status(404).json({ message: 'No hay asignaciones activas.' });
    }
    
    let activeAssignment = null;
    
    for (const a of assignments) {
      if (!a.workShift) {
        activeAssignment = a;
        break;
      }
      const st = new Date(a.workShift.startTime);
      const et = new Date(a.workShift.endTime);
      
      const stMins = st.getUTCHours() * 60 + st.getUTCMinutes();
      const etMins = et.getUTCHours() * 60 + et.getUTCMinutes();
      
      if (stMins <= etMins) {
        if (nowTime >= stMins && nowTime <= etMins) {
          activeAssignment = a;
          break;
        }
      } else {
        if (nowTime >= stMins || nowTime <= etMins) {
          activeAssignment = a;
          break;
        }
      }
    }
    
    if (!activeAssignment) {
      activeAssignment = assignments[0];
    }
    
    res.json(activeAssignment);
  } catch (error) {
    res.status(500).json({ message: 'Error al buscar asignación activa', error: error.message });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const existingId = parseInt(id);
    
    const existingAssignment = await prisma.employeeAssignment.findFirst({ where: { id: existingId, ...businessWhere(req) } });
    if (!existingAssignment) return res.status(404).json({ message: 'Asignación no encontrada' });

    await prisma.employeeAssignment.delete({
      where: { id: existingId }
    });

    res.json({ message: 'Asignación eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la asignación', error: error.message });
  }
};

const toggleAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.employeeAssignment.findFirst({ where: { id: parseInt(id), ...businessWhere(req) } });
    
    if (!existing) return res.status(404).json({ message: 'Asignación no encontrada' });

    const updated = await prisma.employeeAssignment.update({
      where: { id: existing.id },
      data: { isActive: !existing.isActive }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar estado de la asignación', error: error.message });
  }
};

module.exports = {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  toggleAssignmentStatus,
  getActiveAssignment
};
