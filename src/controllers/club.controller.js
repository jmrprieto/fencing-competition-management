const clubService = require('../services/club.service');

async function importClubs(req, res, next) {
  try {
    let csvPayload = null;

    if (req.file && req.file.buffer) {
      csvPayload = req.file.buffer.toString('utf8');
    } else if (typeof req.body === 'string') {
      csvPayload = req.body;
    } else if (req.body && typeof req.body.csv === 'string') {
      csvPayload = req.body.csv;
    }

    const result = await clubService.importClubsFromCsv(csvPayload, req.user);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  importClubs
};
