const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const { ROLES } = require('../utils/roles');

const SALT_ROUNDS = 10;


// =========================
// USER MANAGEMENT
// =========================

async function findUserByUsername(username) {
  const result = await db.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );

  return result.rows[0] || null;
}

async function createUser(username, password, role) {
  if (!username || !password) {
    throw new AppError('MISSING_FIELDS', 400);
  }

  const existing = await db.query(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );

  if (existing.rows.length > 0) {
    throw new AppError('USERNAME_ALREADY_EXISTS', 400);
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await db.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, username, role`,
    [username, hash, role]
  );

  return result.rows[0];
}

async function createCompetitionAdmin(username, password, currentUser) {
  if (!currentUser || currentUser.role !== ROLES.SUPER_ADMIN) {
    throw new AppError('FORBIDDEN', 403);
  }

  return createUser(username, password, ROLES.COMPETITION_ADMIN);
}

async function createSuperAdmin(username, password) {
  if (!username || !password) {
    throw new AppError('MISSING_FIELDS', 400);
  }

  const existingUser = await findUserByUsername(username);
  if (existingUser) {
    if (existingUser.role !== ROLES.SUPER_ADMIN) {
      throw new AppError('USERNAME_ALREADY_EXISTS', 400);
    }
    return {
      id: existingUser.id,
      username: existingUser.username,
      role: existingUser.role
    };
  }

  return createUser(username, password, ROLES.SUPER_ADMIN);
}

async function ensureSuperAdmin() {
  const existing = await db.query(
    'SELECT id FROM users WHERE role = $1',
    [ROLES.SUPER_ADMIN]
  );

  if (existing.rows.length > 0) {
    return;
  }

  const username = process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'A super_admin user is required. Set SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD.'
    );
  }

  await createSuperAdmin(username, password);
}


// =========================
// LOGIN
// =========================

async function login(username, password) {
  if (!username || !password) {
    throw new AppError('MISSING_FIELDS', 400);
  }

  const user = await findUserByUsername(username);

  if (!user) {
    throw new AppError('UNAUTHORIZED', 401);
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new AppError('UNAUTHORIZED', 401);
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
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
      username: user.username,
      role: user.role
    }
  };
}

module.exports = {
  createCompetitionAdmin,
  createSuperAdmin,
  ensureSuperAdmin,
  login
};