export default class ScoreSystem {
  constructor(config) { this.config = config; this.reset(); }
  reset() { this.score = 0; this.recipesCompleted = 0; }
  award(value) { const points = Math.max(0, Math.round(value)); this.score += points; return points; }
  merge(level, multiplier = 1) { return this.award(this.config.LEVELS[level - 1].score * multiplier); }
  save() { return this.award(this.config.SAVE_SCORE); }
}
