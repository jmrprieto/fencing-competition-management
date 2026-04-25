const eliminationService = require('../services/elimination.service');

async function getEliminationTree(req, res, next) {
  try {
    const { id } = req.params;
    const result = await eliminationService.getEliminationTree(id, req.user);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEliminationTree
};
