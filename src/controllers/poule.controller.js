const pouleService = require('../services/poule.service');

async function generatePoules(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pouleService.generatePoules(
      id,
      req.user
    );

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function listPoules(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pouleService.getPoules(id, req.user);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function getPouleDetails(req, res, next) {
  try {
    const { id, pouleId } = req.params;
    const result = await pouleService.getPouleDetails(id, pouleId, req.user);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generatePoules,
  listPoules,
  getPouleDetails
};
