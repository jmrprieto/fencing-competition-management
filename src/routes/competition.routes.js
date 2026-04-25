const express = require('express');
const router = express.Router();

const competitionController = require('../controllers/competition.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/auth.middleware');
const registrationController =
  require('../controllers/competitionRegistration.controller');
const pouleController = require('../controllers/poule.controller');


// =========================
// CREATE COMPETITION
// =========================
router.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  competitionController.createCompetition
);


// =========================
// LIST COMPETITIONS
// =========================
router.get(
  '/',
  authMiddleware,
  competitionController.listCompetitions
);


// =========================
// GET COMPETITION BY ID
// =========================
router.get(
  '/:id',
  authMiddleware,
  competitionController.getCompetitionById
);


// =========================
// UPDATE COMPETITION STATUS
// =========================
router.patch(
  '/:id/status',
  authMiddleware,
  requireRole('admin'),
  competitionController.updateStatus
);

module.exports = router;

// -------------------------
// REGISTER FENCER
// -------------------------
router.post(
  '/:id/fencers',
  authMiddleware,
  registrationController.registerFencer
);


// -------------------------
// LIST FENCERS
// -------------------------
router.get(
  '/:id/fencers',
  authMiddleware,
  registrationController.listFencers
);



// -------------------------
// GENERATE POULES
// -------------------------
router.post(
  '/:id/poules',
  authMiddleware,
  requireRole('admin'),
  pouleController.generatePoules
);  

