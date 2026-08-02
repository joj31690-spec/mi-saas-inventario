const express = require('express');
const router = express.Router();
const inventoryMovementController = require('../controllers/inventoryMovementController');
const { verifyToken, requireBusinessRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', requireBusinessRole(['CEO', 'GERENTE']), inventoryMovementController.getInventoryMovements);
router.delete('/:id', requireBusinessRole(['CEO', 'GERENTE']), inventoryMovementController.deletePurchase);

module.exports = router;
