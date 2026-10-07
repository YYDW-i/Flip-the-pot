import { clamp } from '../utils/MathUtils.js';

export default class GameLoop {
  constructor(config, update, render, raf = callback => requestAnimationFrame(callback), caf = id => cancelAnimationFrame(id)) {
    this.config = config; this.update = update; this.render = render;
    this.raf = raf; this.caf = caf; this.running = false;
    this.accumulator = 0; this.lastTime = null;
    this.frame = this.frame.bind(this);
  }
  advance(dt) {
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, this.config.MAX_FRAME_DT);
    this.accumulator += dt;
    while (this.accumulator + 1e-9 >= this.config.FIXED_DT) {
      this.accumulator -= this.config.FIXED_DT;
      this.update(this.config.FIXED_DT);
    }
    this.render(dt);
  }
  frame(timestamp) {
    if (!this.running) return;
    const now = Number.isFinite(timestamp) ? timestamp : Date.now();
    try { this.advance(this.lastTime === null ? 0 : (now - this.lastTime) / 1000); }
    catch (error) { this.stop(); console.error('PanToss 核心循环发生不可恢复错误', error); if (this.onFatal) this.onFatal(error); return; }
    this.lastTime = now;
    this.frameId = this.raf(this.frame);
  }
  resetClock() { this.lastTime = null; this.accumulator = 0; }
  start() { if (!this.running) { this.running = true; this.resetClock(); this.frameId = this.raf(this.frame); } }
  stop() { this.running = false; this.caf(this.frameId); this.resetClock(); }
}
