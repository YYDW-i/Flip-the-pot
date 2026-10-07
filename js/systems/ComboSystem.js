import { clamp } from '../utils/MathUtils.js';

export default class ComboSystem {
  constructor(config) { this.config = config; this.reset(); }
  reset() { this.count = 0; this.maxCombo = 0; this.airStreak = 0; this.lastTime = -Infinity; this.pulse = 0; }
  update(time, dt) { if (time - this.lastTime > this.config.COMBO_WINDOW) { this.count = 0; this.airStreak = 0; } this.pulse = Math.max(0, this.pulse - dt * 4); }
  add(time, air) {
    if (time - this.lastTime > this.config.COMBO_WINDOW) { this.count = 0; this.airStreak = 0; }
    this.count++; this.maxCombo = Math.max(this.maxCombo, this.count);
    this.airStreak = air ? this.airStreak + 1 : 0; this.lastTime = time; this.pulse = 0.3;
    return clamp(1 + (this.count - 1) * this.config.COMBO_STEP, 1, this.config.COMBO_MAX_MULTIPLIER);
  }
}
