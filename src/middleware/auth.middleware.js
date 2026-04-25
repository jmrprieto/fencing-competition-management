const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');


// =========================
// AUTHENTICATION
// =========================

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 401));
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('UNAUTHORIZED', 401));
  }
}

module.exports = authMiddleware;


// =========================
// AUTHORIZATION (ROLE CHECK)
// =========================

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 401));
    }

    if (req.user.role !== role) {
      return next(new AppError('FORBIDDEN', 403));
    }

    next();
  };
}


// Optional: multiple roles
function requireAnyRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', 403));
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole,
  requireAnyRole
};
