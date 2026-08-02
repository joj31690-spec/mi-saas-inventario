const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const recipeController = require('../controllers/recipeController');
const { verifyToken, requireBusinessRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(verifyToken);

// Rutas de Menu
router.get('/', requireBusinessRole(['CEO', 'GERENTE', 'EMPLEADO']), menuController.getMenuItems);
router.get('/:id', requireBusinessRole(['CEO', 'GERENTE', 'EMPLEADO']), menuController.getMenuItemById);
router.post('/', requireBusinessRole(['CEO']), upload.single('image'), menuController.createMenuItem);
router.put('/:id', requireBusinessRole(['CEO', 'GERENTE']), upload.single('image'), menuController.updateMenuItem);
router.patch('/:id/publish', requireBusinessRole(['CEO', 'GERENTE']), menuController.publishMenuItem);
router.patch('/:id/unpublish', requireBusinessRole(['CEO', 'GERENTE']), menuController.unpublishMenuItem);
router.delete('/:id', requireBusinessRole(['CEO']), menuController.deleteMenuItem);

// Rutas de Recetas (dependen del Menu ID para listado y creación)
router.get('/:id/recipe', requireBusinessRole(['CEO', 'GERENTE', 'EMPLEADO']), recipeController.getRecipeItems);
router.post('/:id/recipe', requireBusinessRole(['CEO', 'GERENTE']), recipeController.createRecipeItem);

module.exports = router;
