const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, requireBusinessRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(verifyToken);

router.get('/', requireBusinessRole(['CEO', 'GERENTE', 'EMPLEADO']), productController.getProducts);
router.get('/:id', requireBusinessRole(['CEO', 'GERENTE', 'EMPLEADO']), productController.getProductById);
router.post('/', requireBusinessRole(['CEO', 'GERENTE']), upload.single('image'), productController.createProduct);
router.put('/:id', requireBusinessRole(['CEO', 'GERENTE']), upload.single('image'), productController.updateProduct);
router.post('/:id/stock/entry', requireBusinessRole(['CEO', 'GERENTE']), productController.stockEntry);
router.post('/:id/stock/adjustment', requireBusinessRole(['CEO', 'GERENTE']), productController.stockAdjustment);
router.get('/:id/deactivation-impact', requireBusinessRole(['CEO', 'GERENTE']), productController.getDeactivationImpact);
router.delete('/:id', requireBusinessRole(['CEO']), productController.deleteProduct);

module.exports = router;
