const prisma = require('../prismaClient');
const { resolveIngredientCost } = require('../helpers/ingredientResolver');

const getIncome = async (startDate, endDate, businessId) => {
  const where = { businessId };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const result = await prisma.sale.aggregate({
    _sum: { total: true },
    where
  });

  return parseFloat(result._sum.total || 0);
};

const getOperatingExpenses = async (startDate, endDate, businessId) => {
  const where = { businessId, status: { not: 'ANULADO' } };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const result = await prisma.expense.aggregate({
    _sum: { amount: true },
    where
  });

  return parseFloat(result._sum.amount || 0);
};

const getInventoryExpenses = async (startDate, endDate, businessId) => {
  const where = { businessId, type: 'ENTRY' };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const result = await prisma.inventoryMovement.aggregate({
    _sum: { cost: true },
    where
  });

  return parseFloat(result._sum.cost || 0);
};

const getEstimatedMonthlyPayroll = async (businessId) => {
  const businessUsers = await prisma.businessUser.findMany({
    where: { businessId, baseSalary: { not: null } }
  });

  let totalMonthlyEstimate = 0;
  businessUsers.forEach(bu => {
    if (bu.baseSalary && bu.contractType) {
      const sal = parseFloat(bu.baseSalary);
      if (bu.contractType === 'Mensual') totalMonthlyEstimate += sal;
      if (bu.contractType === 'Quincenal') totalMonthlyEstimate += sal * 2;
      if (bu.contractType === 'Por Día') totalMonthlyEstimate += sal * 30;
      if (bu.contractType === 'Por Hora') totalMonthlyEstimate += sal * 160; // 40h/week * 4 weeks
      // Sueldo Unificado / Rotativo es 0, no suma
    }
  });

  const activeAssignments = await prisma.employeeAssignment.findMany({
    where: { businessId, isActive: true, extraPayForShift: { not: null } }
  });

  activeAssignments.forEach(a => {
    if (a.extraPayForShift) {
      // Asumimos un promedio de 20 turnos al mes para el cálculo de nómina estimada
      totalMonthlyEstimate += parseFloat(a.extraPayForShift) * 20;
    }
  });

  return totalMonthlyEstimate;
};

const getActualAutomaticPayroll = async (startDate, endDate, businessId) => {
  // This function acts as a lazy checker for AUTOMATIC salaries
  const businessUsers = await prisma.businessUser.findMany({
    where: { 
      businessId, 
      paymentMode: 'AUTOMATIC',
      baseSalary: { not: null },
      nextPaymentDate: { not: null, lte: new Date() } 
    },
    include: { user: true }
  });

  // Calculate next date helper locally or import it. We can just require userController
  const { calculateNextPaymentDate } = require('../controllers/userController');

  for (const bu of businessUsers) {
    // Generate Expense
    await prisma.expense.create({
      data: {
        businessId,
        date: new Date(),
        concept: `Pago automático de salario - ${bu.user.fullName}`,
        amount: bu.baseSalary,
        status: 'PAGADO',
        category: 'SALARIOS',
        userId: bu.userId
      }
    });

    // Update nextPaymentDate
    const nextDate = calculateNextPaymentDate(bu.nextPaymentDate, bu.contractType || 'Mensual');
    await prisma.businessUser.update({
      where: { id: bu.id },
      data: { nextPaymentDate: nextDate }
    });
  }

  // Note: Since we generated expenses, they will be captured by getOperatingExpenses!
  // So we don't need to return them as a separate value to add to totalExpenses. 
  // We just run this check.
};

const getRecentActivity = async (startDate, endDate, businessId) => {
  let salesWhere = { businessId };
  let expenseWhere = { businessId, status: { not: 'ANULADO' } };
  let movementWhere = { businessId, type: 'ENTRY' };
  
  if (startDate || endDate) {
    salesWhere.createdAt = {};
    expenseWhere.date = {};
    movementWhere.createdAt = {};
    if (startDate) {
      salesWhere.createdAt.gte = new Date(startDate);
      expenseWhere.date.gte = new Date(startDate);
      movementWhere.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      salesWhere.createdAt.lte = new Date(endDate);
      expenseWhere.date.lte = new Date(endDate);
      movementWhere.createdAt.lte = new Date(endDate);
    }
  }

  const [sales, expenses, purchases] = await Promise.all([
    prisma.sale.findMany({ where: salesWhere, include: { cashRegister: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.expense.findMany({ where: expenseWhere, orderBy: { date: 'desc' }, take: 20 }),
    prisma.inventoryMovement.findMany({ where: movementWhere, include: { product: true }, orderBy: { createdAt: 'desc' }, take: 20 })
  ]);

  const activity = [];
  
  sales.forEach(s => {
    activity.push({
      id: `sale-${s.id}`,
      type: 'Venta',
      date: s.createdAt,
      amount: parseFloat(s.total),
      description: s.cashRegister ? s.cashRegister.name : 'Venta'
    });
  });

  expenses.forEach(e => {
    activity.push({
      id: `expense-${e.id}`,
      type: 'Gasto',
      date: e.date,
      amount: parseFloat(e.amount),
      description: e.concept
    });
  });

  purchases.forEach(p => {
    activity.push({
      id: `purchase-${p.id}`,
      type: 'Compra',
      date: p.createdAt,
      amount: parseFloat(p.cost || 0),
      description: p.product ? p.product.name : 'Insumos'
    });
  });

  activity.sort((a, b) => new Date(b.date) - new Date(a.date));
  return activity.slice(0, 20);
};

const getActivityPaginated = async (startDate, endDate, businessId, page = 1, limit = 10) => {
  let salesWhere = { businessId };
  let expenseWhere = { businessId, status: { not: 'ANULADO' } };
  let movementWhere = { businessId, type: 'ENTRY' };
  
  if (startDate || endDate) {
    salesWhere.createdAt = {};
    expenseWhere.date = {};
    movementWhere.createdAt = {};
    if (startDate) {
      salesWhere.createdAt.gte = new Date(startDate);
      expenseWhere.date.gte = new Date(startDate);
      movementWhere.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      salesWhere.createdAt.lte = new Date(endDate);
      expenseWhere.date.lte = new Date(endDate);
      movementWhere.createdAt.lte = new Date(endDate);
    }
  }

  const [sales, expenses, purchases] = await Promise.all([
    prisma.sale.findMany({ where: salesWhere }),
    prisma.expense.findMany({ where: expenseWhere }),
    prisma.inventoryMovement.findMany({ where: movementWhere, include: { product: true } })
  ]);

  let activity = [];

  sales.forEach(s => {
    activity.push({
      id: `sale-${s.id}`,
      type: 'Venta',
      date: s.createdAt,
      amount: parseFloat(s.total),
      description: 'Venta completada'
    });
  });

  expenses.forEach(e => {
    activity.push({
      id: `expense-${e.id}`,
      type: 'Egreso',
      date: e.date,
      amount: parseFloat(e.amount),
      description: e.concept
    });
  });

  purchases.forEach(p => {
    activity.push({
      id: `purchase-${p.id}`,
      type: 'Compra',
      date: p.createdAt,
      amount: parseFloat(p.cost || 0),
      description: p.product ? p.product.name : 'Insumos'
    });
  });

  activity.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const totalItems = activity.length;
  const data = activity.slice((page - 1) * limit, page * limit);

  return { data, totalItems };
};

const getBreakevenPoint = async (startDate, endDate, businessId) => {
  const operatingExpenses = await getOperatingExpenses(startDate, endDate, businessId);
  const payroll = await getEstimatedMonthlyPayroll(businessId);
  const inventoryExpenses = await getInventoryExpenses(startDate, endDate, businessId);

  return operatingExpenses + payroll + inventoryExpenses;
};

const getAverageReventaCost = async (productId, businessId) => {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      productId: productId,
      businessId: businessId,
      type: 'ENTRY',
      cost: { not: null }
    }
  });

  if (!movements || movements.length === 0) return null;

  let totalSpent = 0;
  let totalQty = 0;
  for (const mov of movements) {
    if (mov.cost) {
      totalSpent += parseFloat(mov.cost);
      totalQty += parseFloat(mov.quantity);
    }
  }

  if (totalQty === 0) return null;
  return totalSpent / totalQty;
};

const getAverageRecipeCost = async (menuItemId, businessId) => {
  const menuItem = await prisma.menuItem.findFirst({
    where: { id: menuItemId, businessId },
    include: {
      recipeItems: {
        include: { 
          ingredient: {
            include: {
              linkedProduct: true,
              recipeItems: { include: { product: true } }
            }
          }
        }
      }
    }
  });

  if (!menuItem) return null;
  if (!menuItem.recipeItems || menuItem.recipeItems.length === 0) {
    return null; 
  }

  let totalCost = 0;

  for (const item of menuItem.recipeItems) {
    const cost = await resolveIngredientCost(item.ingredientId, businessId);
    if (cost === null) return null;
    totalCost += cost * parseFloat(item.quantity);
  }

  return totalCost;
};

const getProductProfitability = async (startDate, endDate, businessId) => {
  const where = { sale: { businessId } };
  
  if (startDate || endDate) {
    where.sale.createdAt = {};
    if (startDate) where.sale.createdAt.gte = new Date(startDate);
    if (endDate) where.sale.createdAt.lte = new Date(endDate);
  }

  const saleDetails = await prisma.saleItem.groupBy({
    by: ['menuItemId'],
    _sum: {
      quantity: true,
      subtotal: true
    },
    where
  });

  const products = [];

  for (const group of saleDetails) {
    const menuItemId = group.menuItemId;
    if (!menuItemId) continue;

    const menuItem = await prisma.menuItem.findFirst({ where: { id: menuItemId, businessId } });
    if (!menuItem) continue;

    const quantitySold = parseFloat(group._sum.quantity || 0);
    const totalIncome = parseFloat(group._sum.subtotal || 0);
    const averagePrice = quantitySold > 0 ? totalIncome / quantitySold : 0;

    let unitCost = null;
    if (menuItem.type === 'PREPARADO') {
      unitCost = await getAverageRecipeCost(menuItemId, businessId);
    } else if (menuItem.type === 'REVENTA' && menuItem.linkedProductId) {
      unitCost = await getAverageReventaCost(menuItem.linkedProductId, businessId);
    }

    let unitProfit = null;
    let totalProfit = null;
    let margin = null;

    if (unitCost !== null) {
      unitProfit = averagePrice - unitCost;
      totalProfit = unitProfit * quantitySold;
      if (averagePrice > 0) {
        margin = (unitProfit / averagePrice) * 100;
      }
    }

    products.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      sold: quantitySold,
      price: averagePrice,
      recipeCost: unitCost,
      unitProfit: unitProfit,
      totalProfit: totalProfit,
      margin: margin
    });
  }

  products.sort((a, b) => b.sold - a.sold);

  return products;
};

module.exports = {
  getIncome,
  getOperatingExpenses,
  getInventoryExpenses,
  getEstimatedMonthlyPayroll,
  getBreakevenPoint,
  getAverageRecipeCost,
  getProductProfitability,
  getRecentActivity,
  getActivityPaginated,
  getActualAutomaticPayroll
};
