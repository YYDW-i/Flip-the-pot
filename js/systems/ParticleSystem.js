export default class ParticleSystem {
  constructor(config, random) {
    this.config = config; this.random = random;
    this.pool = Array.from({ length: config.MAX_PARTICLES }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, ttl: 0, radius: 0, color: null }));
    this.reset();
  }
  reset() { this.count = 0; this.texts = []; this.rings = []; this.shakeTime = 0; this.shakePower = 0; }
  burst(x, y, color, amount = 16, force = 250) {
    for (let i = 0; i < amount && this.count < this.pool.length; i++) {
      const p = this.pool[this.count++], angle = this.random.range(0, Math.PI * 2), speed = this.random.range(force * 0.3, force);
      p.x = x; p.y = y; p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed - force * 0.2;
      p.life = p.ttl = this.random.range(0.3, 0.65); p.radius = this.random.range(2, 6); p.color = color;
    }
  }
  text(text, x, y, color = '#d95632', size = 30) {
    if (this.texts.length >= this.config.MAX_FLOAT_TEXTS) this.texts.shift();
    this.texts.push({ text, x, y, color, size, life: 0.95, ttl: 0.95 });
  }
  ring(x, y, radius, color) {
    if (this.rings.length >= this.config.MAX_RINGS) this.rings.shift();
    this.rings.push({ x, y, radius, color, life: 0.45, ttl: 0.45 });
  }
  shake(power = 3, duration = 0.13) { this.shakePower = Math.max(this.shakePower, power); this.shakeTime = Math.max(this.shakeTime, duration); }
  update(dt) {
    for (let i = 0; i < this.count; i++) {
      const p = this.pool[i]; p.life -= dt;
      if (p.life <= 0) { const last = --this.count; this.pool[i] = this.pool[last]; this.pool[last] = p; i--; continue; }
      p.vy += 550 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (const t of this.texts) { t.life -= dt; t.y -= dt * 48; }
    for (const r of this.rings) r.life -= dt;
    this.texts = this.texts.filter(t => t.life > 0); this.rings = this.rings.filter(r => r.life > 0);
    this.shakeTime = Math.max(0, this.shakeTime - dt); if (!this.shakeTime) this.shakePower = 0;
  }
}
