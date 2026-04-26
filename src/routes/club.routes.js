const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth.middleware');
const { requireAnyRole } = require('../middleware/auth.middleware');
const multipartMiddleware = require('../middleware/multipart.middleware');
const clubController = require('../controllers/club.controller');

router.post(
  '/import',
  authMiddleware,
  requireAnyRole(['super_admin', 'competition_admin']),
  multipartMiddleware,
  clubController.importClubs
);

module.exports = router;
