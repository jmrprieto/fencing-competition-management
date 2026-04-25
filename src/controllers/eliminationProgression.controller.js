const service =
  require('../services/eliminationProgression.service');

async function updateBout(req, res, next) {
  try {
    const { id } = req.params;
    const { scoreA, scoreB } = req.body;

    const result =
      await service.updateEliminationBout(
        id,
        scoreA,
        scoreB,
        req.user.id
      );

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateBout
};
