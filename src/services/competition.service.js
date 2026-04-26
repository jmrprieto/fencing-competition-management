const db = require('../config/db');
const competitionRepository = require('../repositories/competition.repository');
const clubRepository = require('../repositories/club.repository');
const pouleRepository = require('../repositories/poule.repository');
const pouleStandingsService = require('./pouleStandings.service');
const eliminationService = require('./elimination.service');
const AppError = require('../utils/appError');


// =========================
// CREATE COMPETITION
// =========================

async function createCompetition(data, user) {
  const {
    name,
    city,
    country,
    category,
    club_id,
    clubId,
    start_date,
    end_date
  } = data;

  // -------------------------
  // AUTHORIZATION
  // -------------------------

  if (!user) {
    throw new AppError('UNAUTHORIZED', 401);
  }

  if (user.role !== 'competition_admin' && user.role !== 'super_admin') {
    throw new AppError('FORBIDDEN', 403);
  }

  // -------------------------
  // VALIDATION
  // -------------------------

  if (!name || !city || !country || !category || !club_id && !clubId || !start_date) {
    throw new AppError('MISSING_FIELDS', 400);
  }

  const clubId = Number(club_id ?? clubId);

  if (!Number.isInteger(clubId) || clubId <= 0) {
    throw new AppError('INVALID_CLUB_ID', 400);
  }

  const club = await clubRepository.findClubById(clubId);

  if (!club) {
    throw new AppError('CLUB_NOT_FOUND', 404);
  }

  const startDate = new Date(start_date);
  const endDate = end_date ? new Date(end_date) : null;

  if (isNaN(startDate.getTime())) {
    throw new AppError('INVALID_START_DATE', 400);
  }

  if (endDate && isNaN(endDate.getTime())) {
    throw new AppError('INVALID_END_DATE', 400);
  }

  if (endDate && endDate < startDate) {
    throw new AppError('END_DATE_BEFORE_START', 400);
  }

  // -------------------------
  // NORMALIZATION
  // -------------------------

  const competition = {
    name: name.trim(),
    city: city.trim(),
    country: country.trim(),
    category: category.trim(),
    club_id: clubId,
    start_date: startDate,
    end_date: endDate,

    // 🔐 ownership enforced here
    admin_id: user.id
  };

  // -------------------------
  // PERSISTENCE
  // -------------------------

  return await competitionRepository.createCompetition(competition);
}


// =========================
// GET BY ID (OWNERSHIP RULE)
// =========================

async function getCompetitionById(id, user) {
  const competition = await competitionRepository.findById(id);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  // super_admin bypass
  if (user.role !== 'super_admin' && competition.admin_id !== user.id) {
    throw new AppError('FORBIDDEN', 403);
  }

  return competition;
}


// =========================
// LIST COMPETITIONS
// =========================

async function listCompetitions(user) {
  if (user.role === 'super_admin') {
    return await competitionRepository.findAll();
  }

  return await competitionRepository.findByAdminId(user.id);
}

async function getCompetitionResults(id, user) {
  const competition = await competitionRepository.findById(id);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  if (user.role !== 'super_admin' && competition.admin_id !== user.id) {
    throw new AppError('FORBIDDEN', 403);
  }

  const [globalStandings, poules, eliminationTree, finalResults] = await Promise.all([
    pouleStandingsService.getGlobalStandings(id),
    pouleRepository.getPoulesByCompetition(id),
    eliminationService.getEliminationTree(id, user).catch(() => ({ competition_id: id, brackets: [] })),
    getFinalResults(id)
  ]);

  const pouleStandings = await Promise.all(
    poules.map(async (poule) => {
      const standings = await pouleStandingsService.getPouleStandings(poule.id);
      return {
        pouleId: poule.id,
        pouleNumber: poule.poule_number,
        standings: standings.ranking
      };
    })
  );

  return {
    competition,
    globalStandings,
    pouleStandings,
    eliminationTree,
    finalResults
  };
}

async function getFinalResults(competitionId) {
  const result = await db.query(
    `
    SELECT fr.fencer_id,
           fr.final_position,
           f.surname,
           f.given_name
    FROM final_results fr
    LEFT JOIN fencers f ON f.id = fr.fencer_id
    WHERE fr.competition_id = $1
    ORDER BY fr.final_position ASC
    `,
    [competitionId]
  );

  return result.rows.map((row) => ({
    fencer: {
      id: row.fencer_id,
      surname: row.surname,
      given_name: row.given_name
    },
    final_position: row.final_position
  }));
}

// =========================
// UPDATE COMPETITION STATUS (OWNERSHIP + STATE MACHINE)
// =========================

async function updateCompetitionStatus(id, nextStatus, user) {
  const competition = await competitionRepository.findById(id);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  // ownership rule
  if (user.role !== 'super_admin' && competition.admin_id !== user.id) {
    throw new AppError('FORBIDDEN', 403);
  }

  const allowedTransitions = {
    PENDING: ['REGISTRATION'],
    REGISTRATION: ['POULES'],
    POULES: ['ELIMINATION'],
    ELIMINATION: ['FINISHED'],
    FINISHED: []
  };

  const current = competition.status;

  if (!allowedTransitions[current].includes(nextStatus)) {
    throw new AppError('INVALID_STATE_TRANSITION', 400);
  }

  return await competitionRepository.updateStatus(id, nextStatus);
}


module.exports = {
  createCompetition,
  getCompetitionById,
  listCompetitions,
  updateCompetitionStatus
};
