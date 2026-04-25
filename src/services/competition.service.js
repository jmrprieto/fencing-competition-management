const competitionRepository = require('../repositories/competition.repository');
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
    start_date,
    end_date
  } = data;

  // -------------------------
  // AUTHORIZATION
  // -------------------------

  if (!user) {
    throw new AppError('UNAUTHORIZED', 401);
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new AppError('FORBIDDEN', 403);
  }

  // -------------------------
  // VALIDATION
  // -------------------------

  if (!name || !city || !country || !category || !start_date) {
    throw new AppError('MISSING_FIELDS', 400);
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
    throw new AppError('NOT_FOUND', 404);
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

// =========================
// UPDATE COMPETITION STATUS (OWNERSHIP + STATE MACHINE)
// =========================

async function updateCompetitionStatus(id, nextStatus, user) {
  const competition = await competitionRepository.findById(id);

  if (!competition) {
    throw new AppError('NOT_FOUND', 404);
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
