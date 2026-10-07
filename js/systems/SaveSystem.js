export default class SaveSystem {
  constructor(config, pot, score) { this.config = config; this.pot = pot; this.score = score; this.onSave = () => {}; }
  update(bodies, time) {
    const c = this.config, pot = this.pot;
    for (const b of bodies) {
      const localX = Math.abs(pot.localX(b));
      const atRisk = b.airborne && b.velocity.y > 70 && b.position.y > pot.baseY - c.DANGER_HEIGHT && b.position.y < pot.baseY + 100 && localX > c.POT_WIDTH / 2 - b.radius - c.DANGER_EDGE_MARGIN;
      if (atRisk) {
        if (!b.dangerTime || time - b.dangerTime > c.SAVE_WINDOW) { b.dangerTime = time; b.dangerPotX = pot.positionX; }
        b.danger = true;
      } else b.danger = !!b.dangerTime && time - b.dangerTime < c.SAVE_WINDOW && b.airborne;
    }
  }
  land(body, segmentIndex, time) {
    if (segmentIndex !== 1 || !body.dangerTime || time - body.dangerTime > this.config.SAVE_WINDOW || time - body.lastSaveTime < 2) return;
    if (body.position.y > this.pot.positionY + this.config.POT_BOTTOM_Y || Math.abs(this.pot.positionX - body.dangerPotX) < this.config.SAVE_MIN_POT_TRAVEL) return;
    body.dangerTime = 0; body.danger = false; body.lastSaveTime = time;
    this.onSave(body, this.score.save());
  }
}
