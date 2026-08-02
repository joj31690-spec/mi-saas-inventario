const prisma = require('../prismaClient');
const { businessWhere } = require('../utils/businessHelper');

const getExpenses = async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: businessWhere(req),
      include: {
        user: { select: { id: true, username: true, fullName: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener gastos', error: error.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const { concept, category, amount, date, status, supplier, reference, observations } = req.body;
    const userId = req.user.id;

    if (!concept || !category || !amount || !date) {
      return res.status(400).json({ message: 'Concepto, categoría, monto y fecha son obligatorios' });
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });

    const newExpense = await prisma.expense.create({
      data: {
        businessId: req.businessId,
        concept,
        category,
        amount: parseFloat(amount),
        date: new Date(date),
        status: status || 'PAGADO',
        supplier: supplier || null,
        reference: reference || null,
        observations: observations || null,
        userId,
        userNameSnapshot: user ? user.fullName : null
      },
      include: {
        user: { select: { id: true, username: true, fullName: true } }
      }
    });

    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el gasto', error: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { concept, category, amount, date, status, supplier, reference, observations } = req.body;

    const expense = await prisma.expense.findFirst({ where: { id: parseInt(id), ...businessWhere(req) } });
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

    if (expense.status === 'ANULADO') {
      return res.status(400).json({ message: 'No se puede editar un gasto anulado' });
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        concept: concept || expense.concept,
        category: category || expense.category,
        amount: amount !== undefined ? parseFloat(amount) : expense.amount,
        date: date ? new Date(date) : expense.date,
        status: status || expense.status,
        supplier: supplier !== undefined ? supplier : expense.supplier,
        reference: reference !== undefined ? reference : expense.reference,
        observations: observations !== undefined ? observations : expense.observations,
      },
      include: {
        user: { select: { id: true, username: true, fullName: true } }
      }
    });

    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el gasto', error: error.message });
  }
};

const cancelExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await prisma.expense.findFirst({ where: { id: parseInt(id), ...businessWhere(req) } });
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

    if (expense.status === 'ANULADO') {
      return res.status(400).json({ message: 'El gasto ya está anulado' });
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        status: 'ANULADO'
      },
      include: {
        user: { select: { id: true, username: true, fullName: true } }
      }
    });

    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: 'Error al anular el gasto', error: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await prisma.expense.findFirst({ where: { id: parseInt(id), ...businessWhere(req) } });
    
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });
    if (expense.status !== 'ANULADO') return res.status(400).json({ message: 'Solo se pueden eliminar gastos anulados' });

    await prisma.expense.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Gasto eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el gasto', error: error.message });
  }
};

const uncancelExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await prisma.expense.findFirst({ where: { id: parseInt(id), ...businessWhere(req) } });
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });

    if (expense.status !== 'ANULADO') {
      return res.status(400).json({ message: 'El gasto no está anulado' });
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: { status: 'PENDIENTE' },
      include: {
        user: { select: { id: true, username: true, fullName: true } }
      }
    });

    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: 'Error al restaurar el gasto', error: error.message });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  cancelExpense,
  deleteExpense,
  uncancelExpense
};
