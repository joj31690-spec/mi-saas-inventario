const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', assignmentController.getAssignments);
router.get('/active', assignmentController.getActiveAssignment);
router.get('/:id', assignmentController.getAssignmentById);
router.post('/', assignmentController.createAssignment);
router.put('/:id', assignmentController.updateAssignment);
router.patch('/:id/toggle', assignmentController.toggleAssignmentStatus);
router.delete('/:id', assignmentController.deleteAssignment);

module.exports = router;
