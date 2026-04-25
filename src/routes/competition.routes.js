const express = require('express');
const router = express.Router();

const competitionController = require('../controllers/competition.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/auth.middleware');
const multipartMiddleware = require('../middleware/multipart.middleware');
const registrationController =
  require('../controllers/competitionRegistration.controller');
const pouleController = require('../controllers/poule.controller');
const eliminationController = require('../controllers/elimination.controller');


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
// IMPORT FENCERS FROM CSV
// -------------------------
router.post(
  '/:id/fencers/import',
  authMiddleware,
  multipartMiddleware,
  registrationController.importFencers
);

// -------------------------
// IMPORT REFEREES FROM CSV
// -------------------------
router.post(
  '/:id/referees/import',
  authMiddleware,
  multipartMiddleware,
  registrationController.importReferees
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

// -------------------------
// LIST POULES
// -------------------------
router.get(
  '/:id/poules',
  authMiddleware,
  pouleController.listPoules
);

// -------------------------
// POULE DETAILS
// -------------------------
router.get(
  '/:id/poules/:pouleId',
  authMiddleware,
  pouleController.getPouleDetails
);

// -------------------------
// ELIMINATION TREE
// -------------------------
router.get(
  '/:id/elimination',
  authMiddleware,
  eliminationController.getEliminationTree
);

// -------------------------
// POULE DETAILS
// -------------------------
router.get(
  '/:id/poules/:pouleId',
  authMiddleware,
  pouleController.getPouleDetails
);

