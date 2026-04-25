const competitionRepository = require('../repositories/competition.repository');
const competitionFencerRepository = require('../repositories/competitionFencer.repository');
const AppError = require('../utils/appError');

async function registerFencer(competitionId, fencerId, user) {
  const competition = await competitionRepository.findById(competitionId);

  if (!competition) {
    throw new AppError('NOT_FOUND', 404);
  }

  // -------------------------
  // OWNERSHIP CHECK
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

  // -------------------------
  // DUPLICATE CHECK
  // -------------------------
  const alreadyRegistered =
    await competitionFencerRepository.isFencerAlreadyRegistered(
      competitionId,
      fencerId
    );

  if (alreadyRegistered) {
    throw new AppError('FENCER_ALREADY_REGISTERED', 400);
  }

  // -------------------------
  // INSERT
  // -------------------------
  return await competitionFencerRepository.addFencerToCompetition(
    competitionId,
    fencerId
  );
}

async function listFencers(competitionId, user) {
  const competition = await competitionRepository.findById(competitionId);

  if (!competition) {
    throw new AppError('NOT_FOUND', 404);
  }

  if (
    user.role !== 'super_admin' &&
    competition.admin_id !== user.id
  ) {
    throw new AppError('FORBIDDEN', 403);
  }

  return await competitionFencerRepository.getFencersByCompetition(
    competitionId
  );
}

module.exports = {
  registerFencer,
  listFencers
};
