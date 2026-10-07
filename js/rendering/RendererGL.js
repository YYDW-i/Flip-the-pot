import PrimitiveBatch from './PrimitiveBatch.js';
import TextTextureCache from './TextTextureCache.js';

const C = {
  cream: [1, 0.96, 0.89, 1], warm: [0.96, 0.88, 0.74, 1], tile: [1, 0.99, 0.94, 0.45],
  pot: [0.16, 0.2, 0.22, 1], inner: [0.27, 0.33, 0.35, 1], lip: [0.47, 0.56, 0.57, 1],
  orange: [1, 0.52, 0.22, 1], shadow: [0.3, 0.21, 0.14, 0.1]
};
export default class RendererGL {
  constructor(canvas, camera, config, api = wx) {
    this.canvas = canvas; this.camera = camera; this.config = config;
    this.gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: false, stencil: false, preserveDrawingBuffer: false });
    if (!this.gl) throw new Error('PanToss 当前设备无法创建 WebGL 上下文');
    this.batch = new PrimitiveBatch(this.gl); this.text = new TextTextureCache(this.gl, api);
    this.gl.enable(this.gl.BLEND); this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.disable(this.gl.DEPTH_TEST);
  }
  label(value, x, y, size = 26, color = '#514236', align = 'left', bold = false, alpha = 1, scale = 1) {
    this.batch.flush(); this.text.draw(value, x, y, size, color, align, bold, alpha, scale);
  }
  number(value, x, y, size = 42, color = '#514236', align = 'left') { this.batch.flush(); this.text.number(value, x, y, size, color, align); }
  background(pot) {
    const b = this.batch, { width: w, height: h } = this.camera;
    b.gradient(0, 0, w, h, C.cream, C.warm);
    for (let y = this.camera.hudTop + 160; y < pot.baseY - 100; y += 110) {
      b.line(0, y, w, y, 2, C.tile);
      for (let x = 65; x < w; x += 155) b.line(x, y, x, y + 110, 2, C.tile);
    }
    b.rect(0, pot.baseY + 90, w, h, [0.81, 0.62, 0.42, 1]);
    b.rect(0, pot.baseY + 90, w, 12, [0.94, 0.77, 0.54, 1]);
    b.roundedRect(w / 2 - 130, pot.baseY + 112, 260, 46, 18, [0.5, 0.44, 0.35, 0.35]);
    b.ellipse(w / 2, pot.baseY + 115, 95, 16, [0.32, 0.31, 0.29, 0.3]);
  }
  drawPot(pot) {
    const b = this.batch, c = this.config, half = c.POT_WIDTH / 2, bottom = half * c.POT_BOTTOM_RATIO;
    b.ellipse(pot.positionX, pot.baseY + 83, half * 0.9, 18, C.shadow);
    b.transform(pot.positionX, pot.positionY, pot.rotation);
    b.line(half - 5, -39, half + 95, -53, 28, C.pot);
    b.line(half + 27, -43, half + 83, -51, 7, C.inner);
    b.polygon([[-half - 6, -70], [-bottom - 8, 42], [bottom + 8, 42], [half + 6, -70]], C.pot);
    b.polygon([[-half, -70], [-bottom, 30], [bottom, 30], [half, -70]], C.inner);
    b.line(-half, -70, -bottom, 30, 8, C.lip); b.line(bottom, 30, half, -70, 8, C.lip);
    b.line(-bottom, 34, bottom, 34, 7, C.pot); b.transform();
  }
  drawIngredient(body, scale = 1) {
    const b = this.batch, r = body.radius, p = body.position, s = scale * (1 + body.pop);
    b.transform(p.x, p.y, body.rotation, s * (1 + body.squash), s * (1 - body.squash));
    if (body.type === 'tomato') {
      b.ellipse(0, 2, r, r * 0.92, [0.91, 0.2, 0.2, 1]);
      b.ellipse(-r * 0.24, -r * 0.3, r * 0.2, r * 0.1, [1, 0.78, 0.65, 0.7]);
      b.polygon([[0, -r * 0.5], [-r * 0.55, -r * 0.95], [-r * 0.13, -r * 0.91], [0, -r * 1.16], [r * 0.13, -r * 0.89], [r * 0.53, -r * 0.85]], [0.25, 0.56, 0.27, 1]);
    } else if (body.type === 'egg') {
      b.ellipse(0, 0, r, r * 0.94, [1, 0.99, 0.88, 1]);
      b.circle(1, 2, r * 0.53, [1, 0.73, 0.2, 1]);
      b.ellipse(-r * 0.14, -r * 0.16, r * 0.15, r * 0.09, [1, 0.95, 0.63, 0.85]);
    } else {
      b.roundedRect(-r * 0.35, -r * 0.2, r * 0.7, r * 1.05, r * 0.2, [1, 0.91, 0.73, 1]);
      b.ellipse(0, -r * 0.28, r, r * 0.65, [0.69, 0.39, 0.57, 1]);
      b.ellipse(-r * 0.38, -r * 0.42, r * 0.17, r * 0.13, [1, 0.89, 0.82, 0.85]);
      b.ellipse(r * 0.31, -r * 0.22, r * 0.14, r * 0.11, [1, 0.89, 0.82, 0.85]);
    }
    b.circle(-r * 0.22, r * 0.16, r * 0.055, C.pot); b.circle(r * 0.22, r * 0.16, r * 0.055, C.pot);
    for (let i = 0; i < body.level; i++) b.circle((i - (body.level - 1) / 2) * 7, r * 0.53, 2.4, [0.28, 0.23, 0.22, 0.75]);
    b.transform();
  }
  render(game) {
    const gl = this.gl, camera = this.camera;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.clearColor(1, 0.95, 0.86, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    this.batch.begin(camera.width, camera.height); this.text.begin(camera.width, camera.height);
    this.background(game.pot); this.drawPot(game.pot);
    for (const body of game.world.bodies) if (body.alive) this.drawIngredient(body);
    this.label('颠个锅', 40, camera.hudTop + 24, 42, '#514236', 'left', true);
    this.label('分数', 44, camera.hudTop + 80, 23); this.number(game.score.score, 115, camera.hudTop + 80);
    this.label('左右拖动 · 向上甩动 · 移锅接住', camera.width / 2, camera.height - camera.safeBottom - 68, 25, '#fff7e8', 'center');
    this.batch.flush();
  }
  destroy() { this.batch.destroy(); this.text.destroy(); }
}
