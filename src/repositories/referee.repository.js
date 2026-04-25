const db = require('../config/db');

async function getRefereesByCompetition(competitionId) {
  const result = await db.query(
    `
    SELECT r.*
    FROM referees r
    JOIN competition_referees cr ON cr.referee_id = r.id
    WHERE cr.competition_id = $1
    `,
    [competitionId]
  );

  return result.rows;
}

async function findRefereeByName(name) {
  const result = await db.query(
    `
    SELECT * FROM referees
    WHERE LOWER(name) = LOWER($1)
    LIMIT 1
    `,
    [name.trim()]
  );

  return result.rows[0];
}

async function createReferee(name) {
  const result = await db.query(
    `
    INSERT INTO referees (name)
    VALUES ($1)
    RETURNING *
    `,
    [name.trim()]
  );

  return result.rows[0];
}

async function addRefereeToCompetition(competitionId, refereeId) {
  const result = await db.query(
    `
    INSERT INTO competition_referees (competition_id, referee_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    RETURNING *
    `,
    [competitionId, refereeId]
  );

  return result.rows[0];
}

module.exports = {
  getRefereesByCompetition,
  findRefereeByName,
  createReferee,
  addRefereeToCompetition
};
