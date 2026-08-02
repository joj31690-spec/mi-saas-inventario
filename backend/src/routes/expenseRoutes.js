const express = require('express');
const router = express.Router();
const { getExpenses, createExpense, updateExpense, cancelExpense, deleteExpense, uncancelExpense } = require('../controllers/expenseController');
const { verifyToken, requireBusinessRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireBusinessRole(['CEO'])); // Solo CEO

router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.put('/:id/cancel', cancelExpense);
router.put('/:id/uncancel', uncancelExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
