import PrimitiveBatch from './PrimitiveBatch.js';
import TextTextureCache from './TextTextureCache.js';
import ParticleRenderer from './ParticleRenderer.js';
import { clamp } from '../utils/MathUtils.js';
import State from '../core/GameState.js';

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
    this.particleRenderer = new ParticleRenderer();
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
  drawFire(pot, time) {
    const b = this.batch, center = this.camera.width / 2, base = pot.baseY + 113;
    b.ellipse(center, base - 31, 115, 47, [1, 0.42, 0.08, 0.1 + Math.sin(time * 5) * 0.02]);
    b.ellipse(center, base, 96, 14, [0.14, 0.18, 0.2, 0.8]);
    for (let i = 0; i < this.config.FIRE_FLAME_COUNT; i++) {
      const phase = i * 1.73, x = center + (i - (this.config.FIRE_FLAME_COUNT - 1) / 2) * 14;
      const edge = Math.abs(x - center) / 100;
      const height = this.config.FIRE_FLAME_HEIGHT * (0.85 - edge * 0.18 + Math.sin(time * 8 + phase) * 0.22);
      const sway = Math.sin(time * 6 + phase) * 8, y = base + Math.sin(phase) * 3;
      b.ellipse(x, y, 10, 7, [0.16, 0.52, 1, 0.92], 16);
      b.polygon([[x - 8, y - 3], [x - 11, y - height * 0.3], [x - 4, y - height * 0.65],
        [x + sway, y - height], [x + 4 + sway, y - height * 0.55], [x + 10, y - height * 0.25], [x + 8, y - 3]], [1, 0.35, 0.08, 0.94]);
      b.polygon([[x - 5, y - 2], [x - 5, y - height * 0.27], [x + sway * 0.5, y - height * 0.65],
        [x + 5, y - height * 0.23], [x + 5, y - 2]], [1, 0.82, 0.25, 1]);
    }
  }
  drawPot(pot, centerX = pot.positionX, centerY = pot.positionY, rotation = pot.rotation) {
    const b = this.batch, c = this.config, half = c.POT_WIDTH / 2, bottom = half * c.POT_BOTTOM_RATIO;
    b.ellipse(centerX, centerY + 83, half * 0.9, 18, C.shadow);
    b.transform(centerX, centerY, rotation);
    b.line(half - 5, -39, half + 95, -53, 28, C.pot);
    b.line(half + 27, -43, half + 83, -51, 7, C.inner);
    b.polygon([[-half - 6, -70], [-bottom - 8, 42], [bottom + 8, 42], [half + 6, -70]], C.pot);
    b.polygon([[-half, -70], [-bottom, 30], [bottom, 30], [half, -70]], C.inner);
    b.line(-half, -70, -bottom, 30, 8, C.lip); b.line(bottom, 30, half, -70, 8, C.lip);
    b.line(-bottom, 34, bottom, 34, 7, C.pot); b.transform();
  }
  drawMenuHero(game, y) {
    this.drawPot(game.pot, 375, y, -0.06);
    const usable = this.camera.height - this.camera.safeTop - this.camera.safeBottom;
    const poses = [[292, y - usable * 0.11], [402, y - usable * 0.17], [492, y - usable * 0.08]];
    for (let i = 0; i < 3; i++) {
      const body = game.menuIngredients[i]; body.position.x = poses[i][0];
      body.position.y = Math.max(poses[i][1], this.camera.safeTop + usable * 0.30) + Math.sin(game.visualTime * 2 + i) * 9;
      body.rotation = Math.sin(game.visualTime * 1.4 + i) * 0.13; this.drawIngredient(body, clamp(usable / 1250 * 1.6, 1.1, 1.6));
    }
    this.batch.line(320, y - 73, 296, y - 112, 3, [0.7, 0.65, 0.51, 0.3]);
    this.batch.line(474, y - 70, 491, y - 91, 3, [0.7, 0.65, 0.51, 0.3]);
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
    this.background(game.pot);
    if (game.state === State.MENU) {
      if (game.leaderboardOpen) game.leaderboardScreen.render(this, game); else game.menu.render(this, game);
      if (game.nicknamePrompt.open) game.nicknamePromptScreen.render(this, game);
      this.batch.flush(); return;
    }
    const shake = game.particles.shakePower * Math.min(1, game.particles.shakeTime * 8);
    this.batch.root(Math.sin(game.world.time * 90) * shake, Math.cos(game.world.time * 110) * shake * 0.5);
    this.drawFire(game.pot, game.visualTime); this.drawPot(game.pot);
    for (const body of game.world.bodies) {
      if (!body.alive) continue;
      if (body.danger) this.batch.circle(clamp(body.position.x, 24, camera.width - 24), clamp(body.position.y, camera.hudTop + 150, camera.height - 50), body.radius + 8, [1, 0.3, 0.15, 0.16 + Math.sin(game.world.time * 12) * 0.06]);
      this.drawIngredient(body);
    }
    this.particleRenderer.render(this.batch, game.particles); this.batch.root(0, 0);
    for (const dish of game.particles.dishes) {
      const alpha = Math.min(1, dish.life * 3), b = this.batch;
      b.ellipse(dish.x, dish.y + 6, 74, 31, [0.52, 0.41, 0.28, alpha * 0.12]);
      b.ellipse(dish.x, dish.y, 73, 29, [1, 0.99, 0.9, alpha]);
      b.ellipse(dish.x, dish.y - 3, 59, 20, [0.97, 0.83, 0.47, alpha]);
      for (let i = 0; i < 6; i++) {
        const type = dish.recipe.ingredients[i % 2].type, c = this.config.TYPES.find(t => t.id === type).color;
        b.ellipse(dish.x - 38 + i * 15, dish.y - 7 + (i % 2) * 10, 11, 8, [c[0], c[1], c[2], alpha]);
      }
      b.line(dish.x - 12, dish.y - 40, dish.x - 17, dish.y - 58, 3, [1, 1, 1, alpha * 0.5]);
      b.line(dish.x + 12, dish.y - 44, dish.x + 17, dish.y - 62, 3, [1, 1, 1, alpha * 0.5]);
    }
    if (game.state === State.PLAYING && game.spawner.countdown < game.config.SPAWN_PREVIEW_TIME) {
      const x = game.spawner.nextX, y = camera.hudTop + 185;
      this.batch.circle(x, y + 14, 26, [1, 0.55, 0.25, 0.18]);
      this.label('↓', x, y + 14, 32, '#e67741', 'center', true);
    }
    game.hud.render(this, game);
    for (const text of game.particles.texts) this.label(text.text, text.x, text.y, text.size, text.color, 'center', true, Math.min(1, text.life * 3), 1 + Math.max(0, text.life - 0.75) * 0.6);
    this.label('左右拖动 · 向上甩动 · 移锅接住', camera.width / 2, camera.height - camera.safeBottom - 68, 25, '#fff7e8', 'center');
    if (game.state === State.TUTORIAL) game.tutorial.render(this);
    if (game.state === State.PAUSED) game.gameOver.renderPause(this);
    if (game.state === State.GAME_OVER) game.gameOver.render(this, game);
    this.batch.flush();
  }
  destroy() { this.batch.destroy(); this.text.destroy(); }
}
