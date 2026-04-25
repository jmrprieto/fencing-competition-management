function emitEvent(req, event, payload) {
  const io = req.app.get('io');

  if (!io) return;

  io.to(`competition_${payload.competitionId}`)
    .emit(event, payload);
}

module.exports = {
  emitEvent
};
