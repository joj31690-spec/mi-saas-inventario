const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const businessMiddleware = require('../middleware/businessMiddleware');
const upload = require('../middleware/uploadMiddleware');

// GET /api/businesses (Obtener los negocios del usuario, no requiere businessMiddleware)
router.get('/', businessController.getMyBusinesses);

// POST /api/businesses (Crear un negocio, no requiere businessMiddleware)
router.post('/', upload.single('image'), businessController.createBusiness);

// GET /api/businesses/current (Validar la sesión actual, requiere businessMiddleware)
router.get('/current', businessMiddleware, businessController.getCurrentBusinessData);

// PUT /api/businesses/:id (Actualizar negocio, requiere businessMiddleware, ya chequeado dentro)
router.put('/:id', businessMiddleware, upload.single('image'), businessController.updateBusiness);

// DELETE /api/businesses/:id (Eliminar negocio, NO requiere businessMiddleware porque puede hacerse desde el dashboard)
router.delete('/:id', businessController.deleteBusiness);

module.exports = router;
