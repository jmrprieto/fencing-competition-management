const db = require('../config/db');

async function findFencerByUniqueKey(surname, givenName, clubId, sex) {
  const result = await db.query(
    `
    SELECT * FROM fencers
    WHERE LOWER(surname) = LOWER($1)
      AND LOWER(given_name) = LOWER($2)
      AND club_id = $3
      AND sex = $4
    LIMIT 1
    `,
    [surname.trim(), givenName.trim(), clubId, sex]
  );

  return result.rows[0];
}

async function createFencer(surname, givenName, clubId, ranking, sex) {
  const result = await db.query(
    `
    INSERT INTO fencers (surname, given_name, club_id, ranking, sex)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [surname.trim(), givenName.trim(), clubId, ranking, sex]
  );

  return result.rows[0];
}

module.exports = {
  findFencerByUniqueKey,
  createFencer
};
