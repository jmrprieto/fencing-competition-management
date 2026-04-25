const db = require('../config/db');

async function createCompetition(competition) {
  const {
    name,
    city,
    country,
    category,
    start_date,
    end_date,
    admin_id
  } = competition;

  const result = await db.query(
    `
    INSERT INTO competitions
      (name, city, country, category, start_date, end_date, admin_id)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [name, city, country, category, start_date, end_date, admin_id]
  );

  return result.rows[0];
}

async function updateStatus(id, status) {
  const result = await db.query(
    `UPDATE competitions
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  return result.rows[0];
}


module.exports = {
  createCompetition,
  updateStatus
};
