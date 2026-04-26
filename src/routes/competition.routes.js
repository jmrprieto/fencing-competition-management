const express = require('express');
const router = express.Router();

const competitionController = require('../controllers/competition.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireAnyRole } = require('../middleware/auth.middleware');
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
  requireAnyRole(['super_admin', 'competition_admin']),
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
  requireAnyRole(['super_admin', 'competition_admin']),
  competitionController.updateStatus
);

// -------------------------
// REGISTER FENCER
// -------------------------
router.post(
  '/:id/fencers',
  authMiddleware,
  requireAnyRole(['super_admin', 'competition_admin']),
  registrationController.registerFencer
);

// -------------------------
// IMPORT FENCERS FROM CSV
// -------------------------
router.post(
  '/:id/fencers/import',
  authMiddleware,
  requireAnyRole(['super_admin', 'competition_admin']),
  multipartMiddleware,
  registrationController.importFencers
);

// -------------------------
// IMPORT REFEREES FROM CSV
// -------------------------
router.post(
  '/:id/referees/import',
  authMiddleware,
  requireAnyRole(['super_admin', 'competition_admin']),
  multipartMiddleware,
  registrationController.importReferees
);

// -------------------------
// LIST FENCERS
// -------------------------
router.get(
  '/:id/fencers',
  authMiddleware,
  requireAnyRole(['super_admin', 'competition_admin']),
  registrationController.listFencers
);



// -------------------------
// GENERATE POULES
// -------------------------
router.post(
  '/:id/poules',
  authMiddleware,
  requireAnyRole(['super_admin', 'competition_admin']),
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
// COMPETITION RESULTS / REPORT
// -------------------------
router.get(
  '/:id/results',
  authMiddleware,
  requireAnyRole(['super_admin', 'competition_admin']),
  competitionController.getCompetitionResults
);

module.exports = router;

