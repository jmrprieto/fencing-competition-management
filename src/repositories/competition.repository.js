const db = require('../config/db');

async function createCompetition(competition) {
  const {
    name,
    city,
    country,
    category,
    club_id,
    start_date,
    end_date,
    admin_id
  } = competition;

  const result = await db.query(
    `
    INSERT INTO competitions
      (name, city, country, category, club_id, start_date, end_date, admin_id)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `,
    [name, city, country, category, club_id, start_date, end_date, admin_id]
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

async function findById(id) {
  const result = await db.query(
    `
    SELECT *
    FROM competitions
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
}

async function findAll() {
  const result = await db.query(
    `
    SELECT *
    FROM competitions
    ORDER BY start_date DESC, id ASC
    `
  );

  return result.rows;
}

async function findByAdminId(adminId) {
  const result = await db.query(
    `
    SELECT *
    FROM competitions
    WHERE admin_id = $1
    ORDER BY start_date DESC, id ASC
    `,
    [adminId]
  );

  return result.rows;
}

module.exports = {
  createCompetition,
  updateStatus,
  findById,
  findAll,
  findByAdminId
};
