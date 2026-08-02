const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { verifyToken, requireRole, requireBusinessRole } = require('../middleware/authMiddleware');

router.use(verifyToken); // Todas las rutas de ventas requieren autenticación

// GET cajas disponibles para ventas
router.get('/cash-registers', salesController.getCashRegistersForSale);

// GET historial de ventas
router.get('/', salesController.getSales);

// GET detalle de venta
router.get('/:id', salesController.getSaleById);

// POST crear venta (El administrador puede, luego se expandirá para 'worker')
// Por ahora solo validamos el token de forma global, asumimos que todos los autenticados pueden vender.
router.post('/', salesController.createSale);

// DELETE venta (Solo CEO)
router.delete('/:id', requireBusinessRole(['CEO']), salesController.deleteSale);

module.exports = router;
