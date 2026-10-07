export default class AudioManager {
  constructor(api = wx, sources = {}) { this.api = api; this.sources = sources; this.enabled = true; this.contexts = new Map(); }
  play(name) {
    if (!this.enabled || !this.sources[name]) return;
    try {
      let context = this.contexts.get(name);
      if (!context) { context = this.api.createInnerAudioContext(); context.src = this.sources[name]; if (context.onError) context.onError(() => {}); this.contexts.set(name, context); }
      context.seek(0); context.play();
    } catch (e) { /* 未提供本地音效时为 no-op */ }
  }
  playToss() { this.play('toss'); }
  playLand() { this.play('land'); }
  playMerge() { this.play('merge'); }
  playAirMerge() { this.play('airMerge'); }
  playLose() { this.play('lose'); }
  playRecipe() { this.play('recipe'); }
  playGameOver() { this.play('gameOver'); }
  stop() { for (const context of this.contexts.values()) { try { context.stop(); } catch (e) {} } }
  destroy() { for (const context of this.contexts.values()) { try { context.destroy(); } catch (e) {} } this.contexts.clear(); }
}
