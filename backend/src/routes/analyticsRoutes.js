const express = require('express');
const router = express.Router();
const { getSummary, getProfitability, getActivity } = require('../controllers/analyticsController');
const { getDashboardStats } = require('../controllers/dashboardController');
const { verifyToken, requireBusinessRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Dashboard es accesible para todos los que tienen un businessRole
router.get('/dashboard', getDashboardStats);

// Rutas de métricas financieras (Solo CEO)
router.use(requireBusinessRole(['CEO']));
router.get('/summary', getSummary);
router.get('/profitability', getProfitability);
router.get('/activity', getActivity);

module.exports = router;
