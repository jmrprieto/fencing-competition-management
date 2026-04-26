const express = require('express');
const router = express.Router();

const controller =
  require('../controllers/eliminationProgression.controller');

const { authMiddleware, requireAnyRole } = require('../middleware/auth.middleware');

router.patch(
  '/bouts/:id',
  authMiddleware,
  controller.updateBout
);

module.exports = router;
