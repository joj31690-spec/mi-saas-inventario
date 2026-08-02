const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Solo administradores pueden gestionar usuarios
router.use(verifyToken);

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.linkUser);
router.delete('/:id', userController.unlinkUser);
router.put('/:id', userController.updateUser);
router.put('/:id/salary', userController.updateUserSalary);
router.post('/:id/pay-salary', userController.payManualSalary);

module.exports = router;
