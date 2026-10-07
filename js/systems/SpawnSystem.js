import Random from '../utils/Random.js';

export default class SpawnSystem {
  constructor(config, world, camera) { this.config = config; this.world = world; this.camera = camera; this.reset(1); }
  reset(seed) { this.random = new Random(seed); this.elapsed = 0; this.countdown = this.config.SPAWN_INTERVAL; this.bag = []; this.prepare(); }
  prepare() {
    if (!this.bag.length) {
      this.bag = this.config.TYPES.map(t => t.id);
      for (let i = this.bag.length - 1; i > 0; i--) { const j = this.random.int(i + 1); const t = this.bag[i]; this.bag[i] = this.bag[j]; this.bag[j] = t; }
    }
    this.nextType = this.bag.pop();
    this.nextX = this.random.range(this.config.SPAWN_MARGIN, this.camera.width - this.config.SPAWN_MARGIN);
  }
  update(dt) {
    this.elapsed += dt; this.countdown -= dt;
    if (this.countdown > 0) return;
    if (this.world.bodies.length >= this.config.MAX_INGREDIENTS) { this.countdown = 0.4; return; }
    const y = this.camera.hudTop + 185;
    const body = this.world.add(this.nextType, 1, this.nextX, y);
    if (body) { body.airborne = true; body.lastPanContactTime = -10; body.velocity.y = 65; this.prepare(); }
    this.countdown += Math.max(this.config.MIN_SPAWN_INTERVAL, this.config.SPAWN_INTERVAL - this.elapsed * this.config.SPAWN_ACCELERATION);
  }
}
