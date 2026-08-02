const express = require('express');
const router = express.Router();
const globalUserController = require('../controllers/globalUserController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Solo administradores o CEOs pueden gestionar usuarios globales
router.use(verifyToken);
router.use(requireRole('CEO'));

router.get('/', globalUserController.getGlobalUsers);
router.post('/', globalUserController.createGlobalUser);
router.put('/:id', globalUserController.updateGlobalUser);
router.delete('/:id', globalUserController.deleteGlobalUser);

module.exports = router;
