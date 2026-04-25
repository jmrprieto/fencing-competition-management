const competitionService = require('../services/competition.service');

async function createCompetition(req, res, next) {
  try {
    const result = await competitionService.createCompetition(req.body);

    return res.status(201).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await competitionService.updateCompetitionStatus(
      id,
      status,
      req.user
    );

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCompetition,
  updateStatus
};
