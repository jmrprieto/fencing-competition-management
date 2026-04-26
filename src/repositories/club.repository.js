const db = require('../config/db');

async function findClubByName(name) {
  const result = await db.query(
    `
    SELECT * FROM clubs
    WHERE LOWER(name) = LOWER($1)
    LIMIT 1
    `,
    [name.trim()]
  );

  return result.rows[0];
}

async function findClubById(id) {
  const result = await db.query(
    `
    SELECT * FROM clubs
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function createClub(name, city = 'Unknown', country = 'Unknown') {
  const result = await db.query(
    `
    INSERT INTO clubs (name, city, country)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [name.trim(), city.trim(), country.trim()]
  );

  return result.rows[0];
}

module.exports = {
  findClubByName,
  createClub
};
