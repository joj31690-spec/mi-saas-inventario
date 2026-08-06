const prisma = require('../prismaClient');
const { businessWhere } = require('../utils/businessHelper');

const getDashboardStats = async (req, res) => {
  try {
    const businessId = req.businessId;
    const userId = req.user.id;
    const role = req.businessRole;

    // 1. Asistencias Pendientes (Solo para CEO)
    let pendingAttendancesCount = 0;
    if (role === 'CEO') {
      pendingAttendancesCount = await prisma.attendance.count({
        where: { businessId, status: 'PENDING_APPROVAL' }
      });
    }

    // 2. Mi Asistencia de Hoy
    // Primero, verificamos si el usuario tiene una asignación activa
    const myActiveAssignment = await prisma.employeeAssignment.findFirst({
      where: {
        businessId,
        userId,
        isActive: true
      }
    });

    const myLastAttendance = await prisma.attendance.findFirst({
      where: {
        businessId,
        userId,
        date: {
          gte: new Date(new Date().setHours(0,0,0,0))
        }
      },
      orderBy: { date: 'desc' },
      include: {
        assignment: {
          include: { workShift: true }
        }
      }
    });

    // 3. Ventas del Turno Activo & Personal en Local
    const eighteenHoursAgo = new Date(new Date().getTime() - 18 * 60 * 60 * 1000);
    
    const recentAttendances = await prisma.attendance.findMany({
      where: {
        businessId,
        checkInTime: { gte: eighteenHoursAgo },
        status: { notIn: ['ABSENT', 'PENDING_CHECK_IN'] }
      },
      orderBy: { checkInTime: 'asc' }
    });

    let activeShiftStartTime = null;
    let staffCheckedInToday = 0;

    // A) Check for open cash registers first
    const activeCashRegisterAssignments = await prisma.employeeAssignment.findMany({
      where: {
        businessId,
        isActive: true,
        cashRegisterId: { not: null }
      },
      include: {
        attendances: {
          where: { checkInTime: { not: null } },
          orderBy: { checkInTime: 'desc' },
          take: 1
        }
      }
    });

    if (activeCashRegisterAssignments.length > 0) {
      // Find the earliest check-in time among the active cash register assignments for today
      // Actually, if a cash register is open, we can just use the oldest check-in time among them, or if none, fallback
      let earliestCashRegisterCheckIn = null;
      for (const assignment of activeCashRegisterAssignments) {
        if (assignment.attendances.length > 0) {
          const checkIn = assignment.attendances[0].checkInTime;
          if (!earliestCashRegisterCheckIn || checkIn < earliestCashRegisterCheckIn) {
            earliestCashRegisterCheckIn = checkIn;
          }
        }
      }
      if (earliestCashRegisterCheckIn) {
        activeShiftStartTime = earliestCashRegisterCheckIn;
      }
    }

    // B) Fallback: earliest recent check-in
    if (!activeShiftStartTime) {
      if (recentAttendances.length > 0) {
        activeShiftStartTime = recentAttendances[0].checkInTime;
      } else {
        activeShiftStartTime = new Date(new Date().setHours(0,0,0,0));
      }
    }

    staffCheckedInToday = recentAttendances.length;

    const activeShiftSales = await prisma.sale.aggregate({
      where: {
        businessId,
        createdAt: { gte: activeShiftStartTime }
      },
      _sum: { total: true },
      _count: { id: true }
    });

    const today = new Date();
    // Ajustar zona horaria si es necesario, usando UTC por ahora
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = daysOfWeek[today.getUTCDay()];

    const activeAssignmentsCount = await prisma.employeeAssignment.count({
      where: { 
        businessId, 
        isActive: true,
        workShift: {
          is: {
            [dayName]: true,
            isActive: true
          }
        }
      }
    });

    res.json({
      pendingAttendancesCount,
      hasActiveAssignment: !!myActiveAssignment,
      myTodayAttendance: myLastAttendance,
      activeShiftSales: {
        total: activeShiftSales._sum.total || 0,
        count: activeShiftSales._count.id || 0
      },
      staffAssignedToday: activeAssignmentsCount,
      staffCheckedInToday
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

module.exports = {
  getDashboardStats
};
