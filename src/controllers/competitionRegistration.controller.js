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

async function importFencers(req, res, next) {
  try {
    const { id } = req.params;
    let csvPayload = null;

    if (req.file && req.file.buffer) {
      csvPayload = req.file.buffer.toString('utf8');
    } else if (typeof req.body === 'string') {
      csvPayload = req.body;
    } else if (req.body && typeof req.body.csv === 'string') {
      csvPayload = req.body.csv;
    }

    const result =
      await competitionRegistrationService.importFencersFromCsv(
        id,
        csvPayload,
        req.user
      );

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function importReferees(req, res, next) {
  try {
    const { id } = req.params;
    let csvPayload = null;

    if (req.file && req.file.buffer) {
      csvPayload = req.file.buffer.toString('utf8');
    } else if (typeof req.body === 'string') {
      csvPayload = req.body;
    } else if (req.body && typeof req.body.csv === 'string') {
      csvPayload = req.body.csv;
    }

    const result =
      await competitionRegistrationService.importRefereesFromCsv(
        id,
        csvPayload,
        req.user
      );

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerFencer,
  listFencers,
  importFencers,
  importReferees
};
