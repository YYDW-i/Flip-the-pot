export default class ScoreSystem {
  constructor(config) { this.config = config; this.reset(); }
  reset(initial = 0) { this.score = initial; this.peak = initial; this.recipesCompleted = 0; }
  award(value) { const points = Math.max(0, Math.round(value)); this.score += points; this.peak = Math.max(this.peak, this.score); return points; }
  lose(level) {
    const points = this.config.ENDLESS_LOSS_SCORES[Math.max(0, Math.min(4, level - 1))];
    this.score -= points; return points;
  }
  merge(level, multiplier = 1) { return this.award(this.config.LEVELS[level - 1].score * multiplier); }
  save() { return this.award(this.config.SAVE_SCORE); }
  recipe(base, multiplier = 1) { this.recipesCompleted++; return this.award(base * multiplier); }
}
