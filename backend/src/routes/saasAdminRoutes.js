const express = require('express');
const router = express.Router();
const saasAdminMiddleware = require('../middleware/saasAdminMiddleware');
const saasAdminController = require('../controllers/saasAdminController');

// Todas las rutas aquí están protegidas por el middleware de SaaS Admin
router.use(saasAdminMiddleware);

// Rutas de administración
router.get('/stats', saasAdminController.getStats);
router.get('/users', saasAdminController.getUsers);
router.post('/users', saasAdminController.createUser);
router.put('/users/:id', saasAdminController.updateUser);
router.delete('/users/:id', saasAdminController.deleteUser);

module.exports = router;
