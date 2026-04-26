const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

router.post('/login', authController.login);
router.post(
  '/competition-admins',
  authMiddleware,
  requireRole('super_admin'),
  authController.createCompetitionAdmin
);

module.exports = router;
