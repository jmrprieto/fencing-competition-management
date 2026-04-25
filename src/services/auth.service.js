const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');

const SALT_ROUNDS = 10;


// =========================
// CREATE ADMIN USER
// =========================

async function createAdmin(email, password) {
  if (!email || !password) {
    throw new AppError('MISSING_FIELDS', 400);
  }

  const existing = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    throw new AppError('EMAIL_ALREADY_EXISTS', 400);
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await db.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'admin')
     RETURNING id, email, role`,
    [email, hash]
  );

  return result.rows[0];
}


// =========================
// LOGIN
// =========================

async function login(email, password) {
  if (!email || !password) {
    throw new AppError('MISSING_FIELDS', 400);
  }

  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new AppError('UNAUTHORIZED', 401);
  }

  const user = result.rows[0];

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new AppError('UNAUTHORIZED', 401);
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
}

module.exports = {
  createAdmin,
  login
};