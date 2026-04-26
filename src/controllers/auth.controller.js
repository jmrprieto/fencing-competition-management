const authService = require('../services/auth.service');

async function createCompetitionAdmin(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.createCompetitionAdmin(
      username,
      password,
      req.user
    );

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);

    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCompetitionAdmin,
  login
};
