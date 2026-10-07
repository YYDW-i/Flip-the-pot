import config from '../config/gameConfig.js';
import Camera from '../rendering/Camera.js';
import RendererGL from '../rendering/RendererGL.js';
import Pot from '../entities/Pot.js';
import PhysicsWorld from '../physics/PhysicsWorld.js';
import GameLoop from './GameLoop.js';
import InputManager from '../input/InputManager.js';
import ScoreSystem from '../systems/ScoreSystem.js';
import MergeSystem from '../systems/MergeSystem.js';
import ComboSystem from '../systems/ComboSystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import ParticleSystem from '../systems/ParticleSystem.js';
import HapticManager from '../services/HapticManager.js';
import AudioManager from '../services/AudioManager.js';
import Random from '../utils/Random.js';

export default class Game {
  constructor(api = wx, options = {}) {
    this.api = api; this.config = Object.assign({}, config);
    this.canvas = api.createCanvas();
    this.camera = new Camera(this.canvas, this.config, api);
    this.renderer = new RendererGL(this.canvas, this.camera, this.config, api);
    this.pot = new Pot(this.config, this.camera.width, this.camera.height, this.camera.safeBottom);
    this.world = new PhysicsWorld(this.config, this.pot);
    this.score = new ScoreSystem(this.config);
    this.combo = new ComboSystem(this.config); this.slowTime = 0; this.lastSlowTime = -10;
    this.particles = new ParticleSystem(this.config, new Random(711));
    this.haptics = new HapticManager(this.config, api); this.audio = new AudioManager(api);
    this.saveSystem = new SaveSystem(this.config, this.pot, this.score);
    this.merge = new MergeSystem(this.world, this.score, this.config, this.combo);
    this.merge.onMerge = (body, points, air) => this.mergeFeedback(body, points, air);
    this.saveSystem.onSave = (body, points) => { this.particles.text('救回来了！ +' + points, body.position.x, body.position.y - 65, '#3e8561'); this.haptics.light(); };
    this.world.onPair = (a, b) => this.merge.collide(a, b);
    this.world.onLand = (body, impact, index) => { this.saveSystem.land(body, index, this.world.time); this.audio.playLand(); if (impact > 400) this.particles.shake(2, 0.08); };
    this.world.onCollision = (a, b) => this.particles.burst((a.position.x + b.position.x) / 2, (a.position.y + b.position.y) / 2, [1, 0.85, 0.57, 1], 3, 90);
    const initial = this.config.INITIAL_INGREDIENTS;
    initial.forEach((type, i) => this.world.add(type, 1, this.pot.positionX + (i - (initial.length - 1) / 2) * this.config.INITIAL_SPACING, this.pot.positionY - 8));
    this.input = new InputManager(this.camera, this.config, {
      dragStart: p => { this.pot.setTarget(p.x); return p.y > this.camera.height * 0.45; },
      dragMove: (p, data) => { this.pot.setTarget(p.x, data.velocityX); if (data.toss) this.toss(data.toss); },
      tap: () => {}
    }, api);
    this.loop = new GameLoop(this.config, dt => this.update(dt), () => this.renderer.render(this), options.raf, options.caf);
    if (options.autoStart !== false) this.loop.start();
  }
  toss(gesture) {
    const count = this.pot.toss(this.world.bodies, gesture, this.world.time);
    if (count) { this.audio.playToss(); this.haptics.light(); }
    return count;
  }
  mergeFeedback(body, points, air) {
    const p = body.position, color = this.config.TYPES.find(type => type.id === body.type).color;
    this.particles.burst(p.x, p.y, color, air ? 28 + Math.min(30, this.combo.count * 4) : 14, air ? 370 : 230);
    this.particles.ring(p.x, p.y, body.radius, air ? [1, 0.75, 0.2, 1] : color);
    this.particles.text((air ? '空中合成！ +' : '+') + points, p.x, p.y - body.radius - 30, air ? '#d65a2a' : '#6b5944', air ? 34 : 27);
    if (air) { this.audio.playAirMerge(); this.haptics.light(); this.particles.shake(3); } else this.audio.playMerge();
    if (body.level >= 4) this.particles.shake(3);
    if (this.combo.airStreak >= 2) this.particles.text('完美颠锅！', this.camera.width / 2, this.camera.hudTop + 180, '#d65a2a', 38);
    if (this.combo.count >= 4 && this.world.time - this.lastSlowTime > this.config.SLOWMO_COOLDOWN) { this.slowTime = this.config.SLOWMO_DURATION; this.lastSlowTime = this.world.time; }
  }
  update(dt) {
    this.slowTime = Math.max(0, this.slowTime - dt);
    this.saveSystem.update(this.world.bodies, this.world.time);
    this.world.step(dt * (this.slowTime > 0 ? this.config.SLOWMO_SCALE : 1), dt);
    this.combo.update(this.world.time, dt); this.particles.update(dt);
  }
  destroy() { this.loop.stop(); this.input.destroy(); this.renderer.destroy(); this.audio.destroy(); }
}
