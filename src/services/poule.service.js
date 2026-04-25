const competitionRepository = require('../repositories/competition.repository');
const pouleRepository = require('../repositories/poule.repository');
const competitionFencerRepository =
  require('../repositories/competitionFencer.repository');
const AppError = require('../utils/appError');
const refereeRepository =
  require('../repositories/referee.repository');

async function generatePoules(competitionId, user) {
  const competition = await competitionRepository.findById(competitionId);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  // -------------------------
  // AUTHORIZATION
  // -------------------------
  if (
    user.role !== 'super_admin' &&
    competition.admin_id !== user.id
  ) {
    throw new AppError('FORBIDDEN', 403);
  }

  // -------------------------
  // STATE CHECK
  // -------------------------
  if (competition.status !== 'REGISTRATION') {
    throw new AppError('INVALID_COMPETITION_STATE', 400);
  }

  const fencers =
    await competitionFencerRepository.getFencersByCompetition(
      competitionId
    );

  if (fencers.length < 2) {
    throw new AppError('NOT_ENOUGH_FENCERS', 400);
  }

  // -------------------------
  // 1. SORT BY RANKING (DESC)
  // -------------------------
  const sorted = [...fencers].sort(
    (a, b) => b.ranking - a.ranking
  );

  // -------------------------
  // 2. DETERMINE NUMBER OF POULES
  // target ~6 per poule
  // -------------------------
  const targetSize = 6;
  let numPoules = Math.round(sorted.length / targetSize);

  if (numPoules < 1) numPoules = 1;

  // initialize empty poules
  const poules = Array.from({ length: numPoules }, () => []);

  // helper: club check
  const hasClubConflict = (poule, fencer) => {
    return poule.some(p => p.club === fencer.club);
  };

  // -------------------------
  // 3. SNAKE DISTRIBUTION
  // -------------------------
  let direction = 1; // 1 forward, -1 reverse
  let index = 0;

  for (const fencer of sorted) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < numPoules) {
      const poule = poules[index];

      // soft constraint: avoid same club if possible
      const conflict = hasClubConflict(poule, fencer);

      if (!conflict) {
        poule.push(fencer);
        placed = true;
      }

      index += direction;

      // reverse direction at bounds (snake effect)
      if (index >= numPoules) {
        index = numPoules - 1;
        direction = -1;
      }

      if (index < 0) {
        index = 0;
        direction = 1;
      }

      attempts++;
    }

    // fallback (if club constraint blocks everything)
    if (!placed) {
      poules[index].push(fencer);
    }
  }

  // -------------------------
  // 4. PERSIST POULES
  // -------------------------
  const createdPoules = [];
  const referees =
  await refereeRepository.getRefereesByCompetition(competitionId);


  for (let i = 0; i < poules.length; i++) {
    const referee =
    referees.length > 0
      ? referees[i % referees.length]
      : null;

    const poule = await pouleRepository.createPoule(
      competitionId,
      i + 1,
      referee?.id || null
    );

    for (const fencer of poules[i]) {
      await pouleRepository.addFencerToPoule(
        poule.id,
        fencer.id
      );
    }

    createdPoules.push(poule);
  }

  return createdPoules;
}

async function getPoules(competitionId, user) {
  const competition = await competitionRepository.findById(competitionId);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  if (user.role !== 'super_admin' && competition.admin_id !== user.id) {
    throw new AppError('FORBIDDEN', 403);
  }

  return await pouleRepository.getPoulesByCompetition(competitionId);
}

async function getPouleDetails(competitionId, pouleId, user) {
  const competition = await competitionRepository.findById(competitionId);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  if (user.role !== 'super_admin' && competition.admin_id !== user.id) {
    throw new AppError('FORBIDDEN', 403);
  }

  const poule = await pouleRepository.getPouleById(pouleId);
  if (!poule || Number(poule.competition_id) !== Number(competitionId)) {
    throw new AppError('POULE_NOT_FOUND', 404);
  }

  const fencers = await pouleRepository.getFencersByPoule(pouleId);
  const bouts = await pouleRepository.getPouleBoutsByPoule(pouleId);

  return {
    ...poule,
    fencers,
    bouts
  };
}

module.exports = {
  generatePoules,
  getPoules,
  getPouleDetails
};
