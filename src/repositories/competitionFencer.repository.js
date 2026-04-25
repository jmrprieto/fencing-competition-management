const db = require('../config/db');

async function addFencerToCompetition(competitionId, fencerId) {
  const result = await db.query(
    `
    INSERT INTO competition_fencers (competition_id, fencer_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    RETURNING *
    `,
    [competitionId, fencerId]
  );

  return result.rows[0];
}

async function getFencersByCompetition(competitionId) {
  const result = await db.query(
    `
    SELECT f.*
    FROM fencers f
    JOIN competition_fencers cf ON cf.fencer_id = f.id
    WHERE cf.competition_id = $1
    `,
    [competitionId]
  );

  return result.rows;
}

async function isFencerAlreadyRegistered(competitionId, fencerId) {
  const result = await db.query(
    `
    SELECT 1 FROM competition_fencers
    WHERE competition_id = $1 AND fencer_id = $2
    `,
    [competitionId, fencerId]
  );

  return result.rows.length > 0;
}

async function getFencersForCompetition(competitionId) {
  const result = await db.query(
    `
    SELECT f.*
    FROM fencers f
    JOIN competition_fencers cf ON cf.fencer_id = f.id
    WHERE cf.competition_id = $1
    ORDER BY f.ranking DESC
    `,
    [competitionId]
  );

  return result.rows;
}

module.exports = {
  addFencerToCompetition,
  getFencersByCompetition,
  isFencerAlreadyRegistered,
  getFencersForCompetition
};
