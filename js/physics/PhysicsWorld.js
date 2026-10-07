import Ingredient from '../entities/Ingredient.js';
import { circleSegment } from './Collision.js';
import { clamp } from '../utils/MathUtils.js';

export default class PhysicsWorld {
  constructor(config, pot) { this.config = config; this.pot = pot; this.reset(); this.onLand = () => {}; }
  reset() { this.bodies = []; this.time = 0; this.nextId = 1; }
  add(type, level, x, y) {
    if (this.bodies.length >= this.config.MAX_INGREDIENTS) return null;
    const body = new Ingredient(this.nextId++, type, level, x, y, this.config); this.bodies.push(body); return body;
  }
  step(dt) {
    const c = this.config, subdt = dt / c.PHYSICS_SUBSTEPS;
    for (let step = 0; step < c.PHYSICS_SUBSTEPS; step++) {
      this.time += subdt; this.pot.update(subdt);
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
        for (const body of this.bodies) {
          if (!body.alive) continue;
          for (const segment of this.pot.segments) {
            const impact = circleSegment(body, segment, this.pot, c);
            if (impact < 0) continue;
            if (body.airborne && impact > 55) { body.squash = Math.min(0.24, impact / 2800); this.onLand(body, impact); }
            body.lastPanContactTime = this.time; body.airborne = false;
          }
        }
      }
      for (const body of this.bodies) {
        body.airborne = this.time - body.lastPanContactTime > c.AIR_CONTACT_DELAY;
        if (!Number.isFinite(body.position.x + body.position.y + body.velocity.x + body.velocity.y + body.rotation)) throw new Error('PanToss 物理出现非有限数值，食材 ID=' + body.id);
      }
    }
  }
}
