const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const businessMiddleware = require('../middleware/businessMiddleware');

// GET /api/attendances?date=YYYY-MM-DD
router.get('/', businessMiddleware, attendanceController.getAttendances);

// POST /api/attendances/:id/check-in
router.post('/:id/check-in', businessMiddleware, attendanceController.checkIn);

// PUT /api/attendances/:id/approve
router.put('/:id/approve', businessMiddleware, attendanceController.approveAttendance);

module.exports = router;
