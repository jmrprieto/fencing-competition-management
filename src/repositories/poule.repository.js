const db = require('../config/db');

async function createPoule(competitionId, pouleNumber, refereeId = null) {
  const existing = await db.query(
    `
    SELECT *
    FROM poules
    WHERE competition_id = $1 AND poule_number = $2
    LIMIT 1
    `,
    [competitionId, pouleNumber]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

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
  const result = await db.query(
    `
    INSERT INTO poule_fencers (poule_id, fencer_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    RETURNING *
    `,
    [pouleId, fencerId]
  );

  return result.rows[0];
}

async function findPouleBout(pouleId, fencerAId, fencerBId) {
  const result = await db.query(
    `
    SELECT *
    FROM poule_bouts
    WHERE poule_id = $1
      AND ((fencer_a_id = $2 AND fencer_b_id = $3)
        OR (fencer_a_id = $3 AND fencer_b_id = $2))
    LIMIT 1
    `,
    [pouleId, fencerAId, fencerBId]
  );

  return result.rows[0];
}

async function createPouleBout(pouleId, fencerAId, fencerBId, refereeId = null) {
  const existing = await findPouleBout(
    pouleId,
    fencerAId,
    fencerBId
  );

  if (existing) {
    return existing;
  }

  const result = await db.query(
    `
    INSERT INTO poule_bouts (poule_id, fencer_a_id, fencer_b_id, referee_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [pouleId, fencerAId, fencerBId, refereeId]
  );

  return result.rows[0];
}

async function getPoulesByCompetition(competitionId) {
  const result = await db.query(
    `
    SELECT p.id, p.poule_number, p.referee_id
    FROM poules p
    WHERE p.competition_id = $1
    ORDER BY p.poule_number ASC
    `,
    [competitionId]
  );

  return result.rows;
}

async function getPouleById(pouleId) {
  const result = await db.query(
    `
    SELECT p.*
    FROM poules p
    WHERE p.id = $1
    LIMIT 1
    `,
    [pouleId]
  );

  return result.rows[0];
}

async function getFencersByPoule(pouleId) {
  const result = await db.query(
    `
    SELECT f.*
    FROM fencers f
    JOIN poule_fencers pf ON pf.fencer_id = f.id
    WHERE pf.poule_id = $1
    ORDER BY f.ranking DESC
    `,
    [pouleId]
  );

  return result.rows;
}

async function getPouleBoutsByPoule(pouleId) {
  const result = await db.query(
    `
    SELECT pb.*
    FROM poule_bouts pb
    WHERE pb.poule_id = $1
    ORDER BY pb.id ASC
    `,
    [pouleId]
  );

  return result.rows;
}

module.exports = {
  createPoule,
  addFencerToPoule,
  createPouleBout,
  getPoulesByCompetition,
  getPouleById,
  getFencersByPoule,
  getPouleBoutsByPoule
};
