const service = require('../services/pouleProgression.service');

async function updatePouleBout(req, res, next) {
  try {
    const { id } = req.params;
    const { scoreA, scoreB } = req.body;

    const result = await service.updatePouleBout(
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
  updatePouleBout
};
