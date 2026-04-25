const db = require('../config/db');
const AppError = require('../utils/appError');

const transitions = {
  CREATED: ['REGISTRATION'],
  REGISTRATION: ['POULES_GENERATED'],
  POULES_GENERATED: ['POULES_FINISHED'],
  POULES_FINISHED: ['ELIMINATION_GENERATED'],
  ELIMINATION_GENERATED: ['ELIMINATION_RUNNING'],
  ELIMINATION_RUNNING: ['FINISHED'],
  FINISHED: []
};

async function getCompetition(id) {
  const result = await db.query(
    `SELECT * FROM competitions WHERE id = $1`,
    [id]
  );

  return result.rows[0];
}

async function transitionCompetition(competitionId, nextStatus) {
  const competition = await getCompetition(competitionId);

  if (!competition) {
    throw new AppError('COMPETITION_NOT_FOUND', 404);
  }

  const allowed = transitions[competition.status] || [];

  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      `INVALID_TRANSITION: ${competition.status} → ${nextStatus}`,
      400
    );
  }

  const result = await db.query(
    `
    UPDATE competitions
    SET status = $1
    WHERE id = $2
    RETURNING *
    `,
    [nextStatus, competitionId]
  );

  return result.rows[0];
}

async function assertCompetitionState(competitionId, expectedStates) {
  const competition = await getCompetition(competitionId);

  if (!expectedStates.includes(competition.status)) {
    throw new AppError(
      `INVALID_COMPETITION_STATE: expected ${expectedStates.join(', ')}`,
      400
    );
  }

  return competition;
}

