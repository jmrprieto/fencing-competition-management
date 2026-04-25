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

module.exports = {
  getRefereesByCompetition
};
