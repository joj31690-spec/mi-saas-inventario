const prisma = require('../prismaClient');

// Helper para asegurar que el usuario es CEO o admin/encargado
const assertAttendanceAdmin = async (req) => {
  if (req.businessRole === 'CEO') return true;

  const bu = await prisma.businessUser.findUnique({
    where: { businessId_userId: { businessId: req.businessId, userId: req.user.id } }
  });

  if (!bu || (bu.role !== 'ADMIN' && bu.role !== 'ENCARGADO')) {
    throw new Error('No tienes permisos para administrar asistencias');
  }
  return true;
};

exports.getAttendances = async (req, res) => {
  try {
    const { date, all } = req.query;

    if (all === 'true') {
      const attendances = await prisma.attendance.findMany({
        where: {
          businessId: req.businessId,
          status: { not: 'PENDING_CHECK_IN' },
          ...(req.businessRole !== 'CEO' ? { userId: req.user.id } : {})
        },
        include: {
          user: true,
          assignment: {
            include: { position: true, workShift: true }
          }
        },
        orderBy: [{ date: 'desc' }, { user: { fullName: 'asc' } }]
      });
      return res.json(attendances);
    }

    if (!date) return res.status(400).json({ message: 'Se requiere una fecha (YYYY-MM-DD)' });

    const queryDate = new Date(`${date}T12:00:00Z`); // Mediodía para evitar problemas de timezone al sacar el día
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = daysOfWeek[queryDate.getUTCDay()];

    // Buscar asignaciones activas con turno
    const assignments = await prisma.employeeAssignment.findMany({
      where: {
        businessId: req.businessId,
        isActive: true,
        workShiftId: { not: null }
      },
      include: {
        workShift: true,
        user: true,
        position: true
      }
    });

    const targetDate = new Date(`${date}T00:00:00Z`); // Inicio del día en UTC para guardar

    // Sincronizar: Crear asistencias faltantes
    for (const assignment of assignments) {
      if (assignment.workShift && assignment.workShift[dayName] === true && assignment.workShift.isActive) {
        
        // Verificar si la fecha de la asignación ya inició
        if (assignment.startDate > targetDate) {
          continue;
        }

        // Verificar si ya existe asistencia
        const existing = await prisma.attendance.findUnique({
          where: {
            assignmentId_date: {
              assignmentId: assignment.id,
              date: targetDate
            }
          }
        });

        if (!existing) {
          await prisma.attendance.create({
            data: {
              assignmentId: assignment.id,
              userId: assignment.userId,
              businessId: req.businessId,
              date: targetDate,
              status: 'PENDING_CHECK_IN'
            }
          });
        }
      }
    }

    // Obtener todas las asistencias generadas para ese día, filtradas por rol
    const attendances = await prisma.attendance.findMany({
      where: {
        businessId: req.businessId,
        date: targetDate,
        ...(req.businessRole !== 'CEO' ? { userId: req.user.id } : {})
      },
      include: {
        user: true,
        assignment: {
          include: {
            position: true,
            workShift: true
          }
        }
      },
      orderBy: { user: { fullName: 'asc' } }
    });

    res.json(attendances);
  } catch (error) {
    console.error('Error in getAttendances:', error);
    res.status(500).json({ message: 'Error al obtener asistencias' });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const { id } = req.params;
    const { timezoneOffset } = req.body; // Offset en minutos (e.g., 180 para UTC-3)
    
    const attendance = await prisma.attendance.findFirst({
      where: { id: parseInt(id), businessId: req.businessId },
      include: { assignment: { include: { workShift: true } } }
    });

    if (!attendance) return res.status(404).json({ message: 'Asistencia no encontrada' });
    if (attendance.userId !== req.user.id && req.businessRole !== 'CEO') {
      return res.status(403).json({ message: 'Solo el empleado puede marcar su propia asistencia' });
    }
    if (attendance.status !== 'PENDING_CHECK_IN') {
      return res.status(400).json({ message: 'La asistencia ya ha sido marcada' });
    }

    const shift = attendance.assignment.workShift;
    
    // Check-in logic
    const now = new Date();
    
    const shiftHours = shift.startTime.getUTCHours();
    const shiftMinutes = shift.startTime.getUTCMinutes();
    
    // Convertir el target date a la fecha absoluta de inicio en UTC sumando el offset
    const targetDateStr = attendance.date.toISOString().split('T')[0];
    const shiftStartAbsolute = new Date(`${targetDateStr}T00:00:00Z`);
    shiftStartAbsolute.setUTCHours(shiftHours, shiftMinutes, 0, 0);

    if (timezoneOffset !== undefined) {
      shiftStartAbsolute.setUTCMinutes(shiftStartAbsolute.getUTCMinutes() + timezoneOffset);
    }

    // Limit check in to at most 15 minutes before
    const diffMinutes = (now.getTime() - shiftStartAbsolute.getTime()) / 60000;
    
    if (diffMinutes < -15) {
      return res.status(400).json({ message: 'Es muy temprano para marcar asistencia (se permite 15 min antes del inicio del turno)' });
    }

    // Note: If diffMinutes > shift.toleranceMinutes, it's considered late. We still allow it, state goes to PENDING_APPROVAL.
    // We can save the delay in notes or compute it on the frontend.
    const isLate = diffMinutes > shift.toleranceMinutes;
    const notes = isLate ? `Atraso: ${Math.floor(diffMinutes)} minutos` : null;

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkInTime: now,
        status: 'PENDING_APPROVAL',
        notes: notes
      },
      include: {
        user: true,
        assignment: {
          include: { position: true, workShift: true }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error in checkIn:', error);
    res.status(500).json({ message: 'Error al marcar asistencia' });
  }
};

exports.approveAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED' or 'ABSENT'

    if (!['APPROVED', 'REJECTED', 'ABSENT'].includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    await assertAttendanceAdmin(req);

    const attendance = await prisma.attendance.findFirst({
      where: { id: parseInt(id), businessId: req.businessId }
    });

    if (!attendance) return res.status(404).json({ message: 'Asistencia no encontrada' });

    // NO AUTO APROBACIÓN
    if (attendance.userId === req.user.id && req.businessRole !== 'CEO') {
      return res.status(403).json({ message: 'No puedes aprobar tu propia asistencia. Contacta al CEO o a otro administrador superior.' });
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { status },
      include: {
        user: true,
        assignment: {
          include: { position: true, workShift: true }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error in approveAttendance:', error);
    res.status(error.message === 'No tienes permisos para administrar asistencias' ? 403 : 500)
       .json({ message: error.message || 'Error al actualizar asistencia' });
  }
};
