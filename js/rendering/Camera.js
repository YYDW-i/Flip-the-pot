import { clamp } from '../utils/MathUtils.js';

export default class Camera {
  constructor(canvas, config, api = wx) { this.canvas = canvas; this.config = config; this.api = api; this.resize(); }
  resize(info) {
    info = info || (this.api.getWindowInfo ? this.api.getWindowInfo() : this.api.getSystemInfoSync());
    this.windowWidth = info.windowWidth || info.screenWidth || 375;
    this.windowHeight = info.windowHeight || info.screenHeight || 667;
    this.width = this.config.DESIGN_WIDTH;
    this.scale = this.windowWidth / this.width;
    this.height = this.windowHeight / this.scale;
    const safe = info.safeArea || {};
    this.safeTop = (safe.top || 0) / this.scale;
    this.safeBottom = Math.max(0, this.windowHeight - (safe.bottom || this.windowHeight)) / this.scale;
    this.hudTop = this.safeTop + 20;
    try {
      if (this.api.getMenuButtonBoundingClientRect) this.hudTop = Math.max(this.hudTop, this.api.getMenuButtonBoundingClientRect().bottom / this.scale + 14);
    } catch (e) { /* 开发者工具可能没有胶囊按钮数据 */ }
    this.dpr = clamp(info.pixelRatio || 1, 1, this.config.MAX_DPR);
    this.canvas.width = Math.round(this.windowWidth * this.dpr);
    this.canvas.height = Math.round(this.windowHeight * this.dpr);
  }
  toWorld(x, y) { return { x: x / this.scale, y: y / this.scale }; }
}
