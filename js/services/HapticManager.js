export default class HapticManager {
  constructor(config, api = wx) { this.config = config; this.api = api; this.enabled = true; this.lastTime = -Infinity; }
  light() {
    const time = Date.now() / 1000;
    if (!this.enabled || time - this.lastTime < this.config.HAPTIC_INTERVAL) return;
    this.lastTime = time;
    try { if (this.api.vibrateShort) this.api.vibrateShort({ type: 'light', fail: () => {} }); } catch (e) { /* 震动不可用不影响游戏 */ }
  }
}
