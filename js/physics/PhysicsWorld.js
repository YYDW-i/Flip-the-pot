import Ingredient from '../entities/Ingredient.js';
import { circleSegment, circleCircle, circlesOverlap } from './Collision.js';
import { clamp } from '../utils/MathUtils.js';

export default class PhysicsWorld {
  constructor(config, pot) {
    this.config = config; this.pot = pot; this.reset();
    this.onLand = () => {}; this.onPair = () => false; this.onCollision = () => {};
  }
  reset() { this.bodies = []; this.pending = []; this.time = 0; this.nextId = 1; }
  add(type, level, x, y) {
    if (this.bodies.length >= this.config.MAX_INGREDIENTS) return null;
    const body = new Ingredient(this.nextId++, type, level, x, y, this.config); this.bodies.push(body); return body;
  }
  queue(type, level, x, y) {
    const liveCount = this.bodies.reduce((n, body) => n + (body.alive ? 1 : 0), 0) + this.pending.length;
    if (liveCount >= this.config.MAX_INGREDIENTS) return null;
    const body = new Ingredient(this.nextId++, type, level, x, y, this.config);
    this.pending.push(body); return body;
  }
  compact() {
    let write = 0;
    for (let i = 0; i < this.bodies.length; i++) if (this.bodies[i].alive) this.bodies[write++] = this.bodies[i];
    this.bodies.length = write;
    for (const body of this.pending) this.bodies.push(body);
    this.pending.length = 0;
  }
  step(dt, controlDt = dt) {
    const c = this.config, subdt = dt / c.PHYSICS_SUBSTEPS;
    for (let step = 0; step < c.PHYSICS_SUBSTEPS; step++) {
      // 慢动作只改变食材时间，锅仍按实时输入跟随。
      this.time += subdt; this.pot.update(controlDt / c.PHYSICS_SUBSTEPS);
      for (const body of this.bodies) {
        if (!body.alive) continue;
        body.previousX = body.position.x; body.previousY = body.position.y;
        body.mergeCooldown = Math.max(0, body.mergeCooldown - subdt);
        body.velocity.y += c.GRAVITY * subdt;
        body.velocity.x *= Math.exp(-c.AIR_DRAG * subdt);
        body.velocity.x = clamp(body.velocity.x, -c.MAX_BODY_SPEED, c.MAX_BODY_SPEED);
        body.velocity.y = clamp(body.velocity.y, -c.MAX_BODY_SPEED, c.MAX_BODY_SPEED);
        body.position.x += body.velocity.x * subdt; body.position.y += body.velocity.y * subdt;
        body.rotation += body.angularVelocity * subdt; body.angularVelocity *= Math.exp(-c.ANGULAR_DRAG * subdt);
        body.squash = Math.max(0, body.squash - subdt * 4); body.pop = Math.max(0, body.pop - subdt * 3);
      }
      for (let iteration = 0; iteration < c.COLLISION_ITERATIONS; iteration++) {
        // 旧对象立即标记死亡，新对象延迟插入，避免索引错乱和同帧重复合成。
        for (let i = 0; i < this.bodies.length; i++) {
          const a = this.bodies[i]; if (!a.alive) continue;
          for (let j = i + 1; j < this.bodies.length; j++) {
            const b = this.bodies[j]; if (!b.alive || !circlesOverlap(a, b)) continue;
            if (!this.onPair(a, b)) {
              const impact = circleCircle(a, b, c);
              if (impact > 140 && iteration === 0) this.onCollision(a, b, impact);
            }
            if (!a.alive) break;
          }
        }
        for (const body of this.bodies) {
          if (!body.alive) continue;
          for (let segmentIndex = 0; segmentIndex < this.pot.segments.length; segmentIndex++) {
            const segment = this.pot.segments[segmentIndex];
            const impact = circleSegment(body, segment, this.pot, c);
            if (impact < 0) continue;
            if (body.airborne && impact > 55) { body.squash = Math.min(0.24, impact / 2800); this.onLand(body, impact, segmentIndex); }
            body.lastPanContactTime = this.time; body.airborne = false;
          }
        }
      }
      this.compact();
      for (const body of this.bodies) {
        body.airborne = this.time - body.lastPanContactTime > c.AIR_CONTACT_DELAY;
        if (!Number.isFinite(body.position.x + body.position.y + body.velocity.x + body.velocity.y + body.rotation)) throw new Error('PanToss 物理出现非有限数值，食材 ID=' + body.id);
      }
    }
  }
}
