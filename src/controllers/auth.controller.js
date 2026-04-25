const authService = require('../services/auth.service');

async function createAdmin(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.createAdmin(email, password);

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createAdmin,
  login
};
