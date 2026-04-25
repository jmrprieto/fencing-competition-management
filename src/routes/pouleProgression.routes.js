const express = require('express');
const router = express.Router();

const controller = require('../controllers/pouleProgression.controller');
const auth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');

// -------------------------
// SECURITY LAYER
// -------------------------
router.patch(
  '/bouts/:id',
  auth,
  requireRole(['super_admin', 'competition_admin', 'referee']),
  controller.updatePouleBout
);

module.exports = router;