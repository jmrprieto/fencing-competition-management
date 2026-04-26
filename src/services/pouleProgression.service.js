const db = require('../config/db');
const AppError = require('../utils/appError');
const eventBus = require('../utils/eventBus');
const { ROLES } = require('../utils/roles');

async function updatePouleBout(boutId, scoreA, scoreB, refereeId, user, req) {
  if (scoreA < 0 || scoreB < 0) {
    throw new AppError('INVALID_SCORE', 400);
  }

  if (scoreA === scoreB) {
    throw new AppError('NO_TIES_ALLOWED', 400);
  }

  // -----------------------------------------
  // 1. FETCH BOUT
  // -----------------------------------------
  const boutRes = await db.query(
    `
    SELECT pb.*, p.competition_id
    FROM poule_bouts pb
    JOIN poules p ON p.id = pb.poule_id
    WHERE pb.id = $1
    `,
    [boutId]
  );
  
  const bout = boutRes.rows[0];

  if (!bout) {
    throw new AppError('BOUT_NOT_FOUND', 404);
  }

  if (bout.status === 'FINISHED') {
    throw new AppError('BOUT_ALREADY_FINISHED', 400);
  }

  assertCanModifyBout(user, bout);
  
  // -----------------------------------------
  // 2. DETERMINE WINNER
  // -----------------------------------------
  if (!bout.fencer_a_id || !bout.fencer_b_id) {
    throw new AppError('INVALID_BOUT_STATE', 400);
  }

  const winnerId =
    scoreA > scoreB
      ? bout.fencer_a_id
      : bout.fencer_b_id;

  // -----------------------------------------
  // 3. UPDATE BOUT
  // -----------------------------------------
  const updated = await db.query(
    `
    UPDATE poule_bouts
    SET
      score_a = $1,
      score_b = $2,
      winner_id = $3,
      referee_id = COALESCE($4, referee_id),
      status = 'FINISHED'
    WHERE id = $5
    RETURNING *
    `,
    [scoreA, scoreB, winnerId, refereeId, boutId]
  );

  const finishedBout = updated.rows[0];

  // -----------------------------------------
  // 4. EMIT EVENT (REAL-TIME UI UPDATE)
  // -----------------------------------------
  eventBus.emitEvent(req, 'poule_bout_updated', {
  competitionId: bout.competition_id,
  pouleId: bout.poule_id,
  boutId: finishedBout.id
});

  // -----------------------------------------
  // 5. RETURN RESULT
  // -----------------------------------------
  return finishedBout;
}

function assertCanModifyBout(user, bout) {
  if (user.role === ROLES.SUPER_ADMIN) return;

  if (user.role === ROLES.COMPETITION_ADMIN) {
    if (bout.competition_id !== user.competition_id) {
      throw new AppError('FORBIDDEN', 403);
    }
    return;
  }

  throw new AppError('FORBIDDEN', 403);
}

module.exports = {
  updatePouleBout,
  assertCanModifyBout
};

function assertCanScoreBout(user, bout, refereeId) {
  if (user.role === ROLES.SUPER_ADMIN) return;

  if (user.role === ROLES.COMPETITION_ADMIN) {
    if (bout.competition_id !== user.competition_id) {
      throw new AppError('FORBIDDEN', 403);
    }
    return;
  }

  throw new AppError('FORBIDDEN', 403);
}

