const express = require('express');
const router = express.Router();
const positionController = require('../controllers/positionController');
const { verifyToken, requireBusinessRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', positionController.getPositions);
router.get('/:id', positionController.getPositionById);

router.use(requireBusinessRole(['CEO']));
router.post('/', positionController.createPosition);
router.put('/:id', positionController.updatePosition);
router.patch('/:id/toggle', positionController.togglePositionStatus);
router.delete('/:id', positionController.deletePosition);

module.exports = router;
