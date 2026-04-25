const db = require('../config/db');
const AppError = require('../utils/appError');

async function assignRefereesToPoules(competitionId, refereeIds) {
  const poulesRes = await db.query(
    `
    SELECT id
    FROM poules
    WHERE competition_id = $1
    ORDER BY id
    `,
    [competitionId]
  );

  const poules = poulesRes.rows;

  if (!refereeIds || refereeIds.length === 0) {
    throw new AppError('NO_REFEREES_AVAILABLE', 400);
  }

  // -----------------------------------------
  // CIRCULAR ASSIGNMENT LOGIC
  // -----------------------------------------
  for (let i = 0; i < poules.length; i++) {
    const refereeId = refereeIds[i % refereeIds.length];
    const pouleId = poules[i].id;

    await db.query(
      `
      UPDATE poule_bouts
      SET referee_id = $1
      WHERE poule_id = $2
      `,
      [refereeId, pouleId]
    );
  }

  return {
    assignedPoules: poules.length,
    assignedReferees: refereeIds.length
  };
}

module.exports = {
  assignRefereesToPoules
};
