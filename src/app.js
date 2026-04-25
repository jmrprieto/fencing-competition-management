const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const competitionRoutes = require('./routes/competition.routes');
const errorMiddleware = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');

const app = express();

// =========================
// GLOBAL MIDDLEWARE
// =========================

// Security headers
app.use(helmet());

// CORS (adjust origin in production)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// =========================
// HEALTH CHECK
// =========================

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// =========================
// ROUTES
// =========================

app.use('/api/competitions', competitionRoutes);
app.use('/api/auth', authRoutes);

// =========================
// 404 HANDLER
// =========================

const AppError = require('./utils/appError');

app.use((req, res, next) => {
  next(new AppError('ROUTE_NOT_FOUND', 404));
});

// =========================
// ERROR HANDLER
// =========================

app.use(errorMiddleware);

module.exports = app;
