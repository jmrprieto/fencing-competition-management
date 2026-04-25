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
  getPoulesByCompetition,
  getPouleById,
  getFencersByPoule,
  getPouleBoutsByPoule
};
