const {
  getIncome,
  getOperatingExpenses,
  getInventoryExpenses,
  getEstimatedMonthlyPayroll,
  getBreakevenPoint,
  getProductProfitability,
  getRecentActivity,
  getActivityPaginated,
  getActualAutomaticPayroll
} = require('../services/financialAnalyticsService');

const getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.businessId;

    // Generar pagos automáticos vencidos de salarios como gastos reales
    await getActualAutomaticPayroll(startDate, endDate, businessId);

    const [income, operatingExpenses, inventoryExpenses, payroll, breakeven, recentActivity] = await Promise.all([
      getIncome(startDate, endDate, businessId),
      getOperatingExpenses(startDate, endDate, businessId),
      getInventoryExpenses(startDate, endDate, businessId),
      getEstimatedMonthlyPayroll(businessId),
      getBreakevenPoint(startDate, endDate, businessId),
      getRecentActivity(startDate, endDate, businessId)
    ]);

    // La nómina estimada (payroll) NO se suma a los egresos totales (Reales).
    // Los salarios pagados (automáticos o manuales) ya están dentro de operatingExpenses (tabla Expense)
    const totalExpenses = operatingExpenses + inventoryExpenses;
    const profit = income - totalExpenses;
    const margin = income > 0 ? (profit / income) * 100 : 0;

    res.json({
      summary: {
        income,
        operatingExpenses,
        inventoryExpenses,
        payroll,
        totalExpenses,
        profit,
        margin
      },
      indicators: {
        breakeven
      },
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular resumen financiero', error: error.message });
  }
};

const getProfitability = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.businessId;
    
    const products = await getProductProfitability(startDate, endDate, businessId);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular rentabilidad de productos', error: error.message });
  }
};

const getActivity = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const businessId = req.businessId;
    
    const limitParam = limit === 'all' ? 'all' : parseInt(limit);
    const result = await getActivityPaginated(startDate, endDate, businessId, parseInt(page), limitParam);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener actividad', error: error.message });
  }
};

module.exports = {
  getSummary,
  getProfitability,
  getActivity
};
