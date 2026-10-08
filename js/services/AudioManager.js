import { AUDIO_SOURCES, AUDIO_VOLUMES } from '../config/audioConfig.js';

export default class AudioManager {
  constructor(api = wx, sources = AUDIO_SOURCES, clock = () => Date.now()) {
    this.api = api; this.sources = sources; this.clock = clock; this.enabled = true;
    this.contexts = new Map(); this.lastPlayed = new Map(); this.warnings = new Set(); this.configured = false;
  }
  warn(name, error) {
    if (this.warnings.has(name)) return;
    this.warnings.add(name); console.warn('PanToss 音效失败 [' + name + ']：', error && (error.errMsg || error.message) || error);
  }
  context(name) {
    if (this.contexts.has(name)) return this.contexts.get(name);
    if (!this.configured) {
      this.configured = true;
      try {
        if (this.api.setInnerAudioOption) this.api.setInnerAudioOption({ obeyMuteSwitch: false, speakerOn: true, fail: e => this.warn('播放设置', e) });
      } catch (e) { this.warn('播放设置', e); }
    }
    // 使用原生驱动，确保全局静音开关/扬声器选项有效。
    const context = this.api.createInnerAudioContext({ useWebAudioImplement: false });
    context.autoplay = false; context.loop = false; context.obeyMuteSwitch = false;
    context.volume = AUDIO_VOLUMES[name] || 0.6;
    if (context.onError) context.onError(error => this.warn(name, error));
    context.src = this.sources[name]; this.contexts.set(name, context); return context;
  }
  prepare() {
    if (!this.enabled || !this.api.createInnerAudioContext) return;
    for (const name of Object.keys(this.sources)) { try { this.context(name); } catch (e) { this.warn(name, e); } }
  }
  setEnabled(enabled) { this.enabled = !!enabled; if (!this.enabled) this.stop(); else this.playMerge(); }
  play(name) {
    if (!this.enabled || !this.sources[name] || !this.api.createInnerAudioContext) return false;
    const now = this.clock(), minimumInterval = name === 'land' ? 110 : 60;
    if (this.lastPlayed.has(name) && now - this.lastPlayed.get(name) < minimumInterval) return false;
    try {
      const context = this.context(name); context.stop(); context.play(); this.lastPlayed.set(name, now); return true;
    } catch (e) { this.warn(name, e); return false; }
  }
  playToss() { this.play('toss'); }
  playLand() { this.play('land'); }
  playMerge() { this.play('merge'); }
  playAirMerge() { this.play('airMerge'); }
  playLose() { this.play('lose'); }
  playRecipe() { this.play('recipe'); }
  playGameOver() { this.play('gameOver'); }
  stop() { for (const context of this.contexts.values()) { try { context.stop(); } catch (e) {} } this.lastPlayed.clear(); }
  destroy() { for (const context of this.contexts.values()) { try { context.destroy(); } catch (e) {} } this.contexts.clear(); }
}
