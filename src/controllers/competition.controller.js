const competitionService = require('../services/competition.service');

async function createCompetition(req, res, next) {
  try {
    const result = await competitionService.createCompetition(req.body, req.user);

    return res.status(201).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function getCompetitionById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await competitionService.getCompetitionById(id, req.user);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function listCompetitions(req, res, next) {
  try {
    const result = await competitionService.listCompetitions(req.user);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function getCompetitionResults(req, res, next) {
  try {
    const { id } = req.params;
    const result = await competitionService.getCompetitionResults(id, req.user);
    res.json({ data: result });
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
  getCompetitionById,
  listCompetitions,
  getCompetitionResults,
  updateStatus
};
