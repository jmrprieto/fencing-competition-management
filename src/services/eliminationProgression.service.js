const db = require('../config/db');
const AppError = require('../utils/appError');
const eventBus = require('../utils/eventBus');

async function updateEliminationBout(boutId, scoreA, scoreB, refereeId) {
  if (scoreA < 0 || scoreB < 0) {
    throw new AppError('INVALID_SCORE', 400);
  }

  if (scoreA === scoreB) {
    throw new AppError('NO_TIES_ALLOWED', 400);
  }

  const winnerId =
    scoreA > scoreB
      ? 'A'
      : 'B';

  // -------------------------
  // 1. FETCH BOUT
  // -------------------------
  const boutRes = await db.query(
    `
    SELECT * FROM elimination_bouts
    WHERE id = $1
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

  const realWinnerId =
    scoreA > scoreB
      ? bout.fencer_a_id
      : bout.fencer_b_id;

  // -------------------------
  // 2. UPDATE BOUT
  // -------------------------
  const updated = await db.query(
    `
    UPDATE elimination_bouts
    SET
      score_a = $1,
      score_b = $2,
      winner_id = $3,
      referee_id = COALESCE($4, referee_id),
      status = 'FINISHED',
      finished_at = NOW()
    WHERE id = $5
    RETURNING *
    `,
    [scoreA, scoreB, realWinnerId, refereeId, boutId]
  );

  const finishedBout = updated.rows[0];

  eventBus.emitEvent(req, 'elimination_bout_updated', {
    competitionId: bout.competition_id,
    boutId,
    scoreA,
    scoreB,
    winnerId: realWinnerId
  });

  // -------------------------
  // 3. PROPAGATE WINNER
  // -------------------------
  if (finishedBout.next_bout_id) {
    const nextRes = await db.query(
      `
      SELECT *
      FROM elimination_bouts
      WHERE id = $1
      `,
      [finishedBout.next_bout_id]
    );

    const nextBout = nextRes.rows[0];

    // Determine slot (A or B)
    const isSlotAEmpty = !nextBout.fencer_a_id;

    await db.query(
      `
      UPDATE elimination_bouts
      SET
        ${isSlotAEmpty ? 'fencer_a_id' : 'fencer_b_id'} = $1
      WHERE id = $2
      `,
      [realWinnerId, nextBout.id]
    );
  }

  eventBus.emitEvent(req, 'elimination_progressed', {
    competitionId: bout.competition_id,
    nextBoutId: finishedBout.next_bout_id
  });

  return finishedBout;
}

async function autoResolveBye(bout) {
  if (!bout.fencer_a_id || !bout.fencer_b_id) {
    const winner =
      bout.fencer_a_id || bout.fencer_b_id;

    await db.query(
      `
      UPDATE elimination_bouts
      SET
        winner_id = $1,
        status = 'FINISHED',
        finished_at = NOW()
      WHERE id = $2
      `,
      [winner, bout.id]
    );

    if (bout.next_bout_id) {
      const next = await db.query(
        `SELECT * FROM elimination_bouts WHERE id = $1`,
        [bout.next_bout_id]
      );

      const nextBout = next.rows[0];

      await db.query(
        `
        UPDATE elimination_bouts
        SET fencer_a_id = COALESCE(fencer_a_id, $1),
            fencer_b_id = CASE
              WHEN fencer_a_id IS NULL THEN fencer_b_id
              ELSE $1
            END
        WHERE id = $2
        `,
        [winner, nextBout.id]
      );
    }
  }
}

module.exports = {
  updateEliminationBout,
  autoResolveBye
};
