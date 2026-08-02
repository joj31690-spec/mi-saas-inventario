const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.put('/:id', recipeController.updateRecipeItem);
router.delete('/:id', recipeController.deleteRecipeItem);

module.exports = router;
