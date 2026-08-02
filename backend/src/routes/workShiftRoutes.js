const express = require('express');
const router = express.Router();
const workShiftController = require('../controllers/workShiftController');
const { verifyToken, requireBusinessRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', workShiftController.getWorkShifts);
router.get('/:id', workShiftController.getWorkShiftById);

router.use(requireBusinessRole(['CEO']));
router.post('/', workShiftController.createWorkShift);
router.put('/:id', workShiftController.updateWorkShift);
router.delete('/:id', workShiftController.deleteWorkShift);

module.exports = router;
