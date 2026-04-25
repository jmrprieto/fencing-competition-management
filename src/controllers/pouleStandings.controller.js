const standingsService =
  require('../services/pouleStandings.service');

async function getPoule(req, res, next) {
  try {
    const { id } = req.params;

    const data =
      await standingsService.getPouleStandings(id);

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function getGlobal(req, res, next) {
  try {
    const { competitionId } = req.params;

    const data =
      await standingsService.getGlobalStandings(
        competitionId
      );

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function getBoutSheet(req, res, next) {
  try {
    const { id } = req.params;

    const data =
      await standingsService.getPouleBoutSheet(id);

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPoule,
  getGlobal,
  getBoutSheet
};
