import config from '../config/gameConfig.js';
import Camera from '../rendering/Camera.js';
import RendererGL from '../rendering/RendererGL.js';
import Pot from '../entities/Pot.js';
import PhysicsWorld from '../physics/PhysicsWorld.js';
import GameLoop from './GameLoop.js';
import InputManager from '../input/InputManager.js';
import ScoreSystem from '../systems/ScoreSystem.js';
import MergeSystem from '../systems/MergeSystem.js';

export default class Game {
  constructor(api = wx, options = {}) {
    this.api = api; this.config = Object.assign({}, config);
    this.canvas = api.createCanvas();
    this.camera = new Camera(this.canvas, this.config, api);
    this.renderer = new RendererGL(this.canvas, this.camera, this.config, api);
    this.pot = new Pot(this.config, this.camera.width, this.camera.height, this.camera.safeBottom);
    this.world = new PhysicsWorld(this.config, this.pot);
    this.score = new ScoreSystem(this.config);
    this.merge = new MergeSystem(this.world, this.score, this.config);
    this.world.onPair = (a, b) => this.merge.collide(a, b);
    const initial = this.config.INITIAL_INGREDIENTS;
    initial.forEach((type, i) => this.world.add(type, 1, this.pot.positionX + (i - (initial.length - 1) / 2) * this.config.INITIAL_SPACING, this.pot.positionY - 8));
    this.input = new InputManager(this.camera, this.config, {
      dragStart: p => { this.pot.setTarget(p.x); return p.y > this.camera.height * 0.45; },
      dragMove: (p, data) => { this.pot.setTarget(p.x, data.velocityX); if (data.toss) this.pot.toss(this.world.bodies, data.toss, this.world.time); },
      tap: () => {}
    }, api);
    this.loop = new GameLoop(this.config, dt => this.update(dt), () => this.renderer.render(this), options.raf, options.caf);
    if (options.autoStart !== false) this.loop.start();
  }
  update(dt) { this.world.step(dt); }
  destroy() { this.loop.stop(); this.input.destroy(); this.renderer.destroy(); }
}
