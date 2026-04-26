const express = require('express');
const router = express.Router();

const controller =
  require('../controllers/pouleStandings.controller');

const { authMiddleware, requireAnyRole } = require('../middleware/auth.middleware');

router.get(
  '/:id/standings',
  authMiddleware,
  controller.getPoule
);

router.get(
  '/competition/:competitionId/global',
  authMiddleware,
  controller.getGlobal
);

router.get(
  '/:id/bout-sheet',
  authMiddleware,
  controller.getBoutSheet
);

module.exports = router;
