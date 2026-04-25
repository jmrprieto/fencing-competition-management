const competitionRegistrationService = require('../services/competitionRegistration.service');

async function registerFencer(req, res, next) {
  try {
    const { competitionId, fencerId } = req.body;

    const result =
      await competitionRegistrationService.registerFencer(
        competitionId,
        fencerId,
        req.user
      );

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function listFencers(req, res, next) {
  try {
    const { id } = req.params;

    const result =
      await competitionRegistrationService.listFencers(
        id,
        req.user
      );

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerFencer,
  listFencers
};
