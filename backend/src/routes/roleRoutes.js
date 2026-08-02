const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/', roleController.getRoles);

module.exports = router;
