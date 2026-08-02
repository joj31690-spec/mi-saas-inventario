const express = require('express');
const router = express.Router();
const cashRegisterController = require('../controllers/cashRegisterController');
const { verifyToken, requireBusinessRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', cashRegisterController.getCashRegisters);
router.get('/:id', cashRegisterController.getCashRegisterById);

router.use(requireBusinessRole(['CEO']));
router.post('/', cashRegisterController.createCashRegister);
router.put('/:id', cashRegisterController.updateCashRegister);
router.patch('/:id/toggle', cashRegisterController.toggleCashRegisterStatus);
router.delete('/:id', cashRegisterController.deleteCashRegister);

module.exports = router;
