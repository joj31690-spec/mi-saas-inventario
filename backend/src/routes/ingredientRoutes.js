const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredientController');
const { verifyToken, requireBusinessRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', requireBusinessRole(['CEO', 'GERENTE', 'EMPLEADO']), ingredientController.getIngredients);
router.get('/:id', requireBusinessRole(['CEO', 'GERENTE', 'EMPLEADO']), ingredientController.getIngredientById);
router.post('/', requireBusinessRole(['CEO', 'GERENTE']), ingredientController.createIngredient);
router.put('/:id', requireBusinessRole(['CEO', 'GERENTE']), ingredientController.updateIngredient);
router.delete('/:id', requireBusinessRole(['CEO']), ingredientController.deleteIngredient);

module.exports = router;
