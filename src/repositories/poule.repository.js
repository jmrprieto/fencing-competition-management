const db = require('../config/db');

async function createPoule(competitionId, pouleNumber, refereeId = null) {
  const result = await db.query(
    `
    INSERT INTO poules (competition_id, poule_number, referee_id)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [competitionId, pouleNumber, refereeId]
  );

  return result.rows[0];
}

async function addFencerToPoule(pouleId, fencerId) {
  return await db.query(
    `
    INSERT INTO poule_fencers (poule_id, fencer_id)
    VALUES ($1, $2)
    `,
    [pouleId, fencerId]
  );
}

module.exports = {
  createPoule,
  addFencerToPoule
};
