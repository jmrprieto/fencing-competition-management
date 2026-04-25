const express = require('express');
const router = express.Router();

const controller =
  require('../controllers/eliminationProgression.controller');

const auth =
  require('../middleware/auth.middleware');

router.patch(
  '/bouts/:id',
  auth,
  controller.updateBout
);

module.exports = router;
