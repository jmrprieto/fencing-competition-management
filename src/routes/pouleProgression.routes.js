const express = require('express');
const router = express.Router();

const controller = require('../controllers/pouleProgression.controller');
const { authMiddleware, requireAnyRole } = require('../middleware/auth.middleware');

// -------------------------
// SECURITY LAYER
// -------------------------
router.patch(
  '/bouts/:id',
  authMiddleware,
  requireAnyRole(['super_admin', 'competition_admin']),
  controller.updatePouleBout
);

module.exports = router;