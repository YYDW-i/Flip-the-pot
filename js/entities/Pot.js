import { clamp } from '../utils/MathUtils.js';

export default class Pot {
  constructor(config, width, height, safeBottom = 0) {
    this.config = config; this.width = width; this.resize(height, safeBottom);
    this.positionX = width / 2; this.targetX = this.positionX; this.rotation = 0;
    this.velocityX = 0; this.velocityY = 0; this.angularVelocity = 0;
    this.gestureVelocityX = 0; this.kick = 0; this.cooldown = 0; this.tossId = 0;
    this.segments = Array.from({ length: 3 }, () => ({ ax: 0, ay: 0, bx: 0, by: 0, nx: 0, ny: 0 }));
    this.updateSegments();
  }
  resize(height, safeBottom = 0) { this.baseY = height - this.config.POT_BOTTOM_MARGIN - safeBottom; this.positionY = this.baseY; }
  setTarget(x, velocityX = 0) {
    const margin = this.config.POT_WIDTH / 2 + this.config.POT_SCREEN_MARGIN;
    this.targetX = clamp(x, margin, this.width - margin);
    this.gestureVelocityX = clamp(velocityX, -2400, 2400);
  }
  update(dt) {
    const c = this.config, oldY = this.positionY;
    this.velocityX += ((this.targetX - this.positionX) * c.POT_FOLLOW_STIFFNESS - this.velocityX * c.POT_DAMPING) * dt;
    this.velocityX = clamp(this.velocityX, -c.POT_MAX_SPEED, c.POT_MAX_SPEED);
    this.positionX += this.velocityX * dt;
    const margin = c.POT_WIDTH / 2 + c.POT_SCREEN_MARGIN;
    if (this.positionX < margin || this.positionX > this.width - margin) { this.positionX = clamp(this.positionX, margin, this.width - margin); this.velocityX = 0; }
    const targetAngle = clamp((this.velocityX + this.gestureVelocityX * 0.15) * c.POT_VELOCITY_TILT + (this.targetX - this.positionX) * c.POT_ERROR_TILT, -c.POT_MAX_TILT, c.POT_MAX_TILT);
    this.angularVelocity += ((targetAngle - this.rotation) * c.POT_TILT_STIFFNESS - this.angularVelocity * c.POT_TILT_DAMPING) * dt;
    this.rotation = clamp(this.rotation + this.angularVelocity * dt, -c.POT_MAX_TILT, c.POT_MAX_TILT);
    this.gestureVelocityX *= Math.exp(-10 * dt); this.cooldown = Math.max(0, this.cooldown - dt); this.kick = Math.max(0, this.kick - dt);
    this.positionY = this.baseY - Math.sin(Math.min(1, this.kick / 0.16) * Math.PI) * 12;
    this.velocityY = (this.positionY - oldY) / dt; this.updateSegments();
  }
  updateSegments() {
    const c = this.config, half = c.POT_WIDTH / 2, bottom = half * c.POT_BOTTOM_RATIO;
    const points = [[-half, c.POT_BOTTOM_Y - c.POT_DEPTH], [-bottom, c.POT_BOTTOM_Y], [bottom, c.POT_BOTTOM_Y], [half, c.POT_BOTTOM_Y - c.POT_DEPTH]];
    const cos = Math.cos(this.rotation), sin = Math.sin(this.rotation);
    for (let i = 0; i < 3; i++) {
      const s = this.segments[i], a = points[i], b = points[i + 1];
      s.ax = this.positionX + a[0] * cos - a[1] * sin; s.ay = this.positionY + a[0] * sin + a[1] * cos;
      s.bx = this.positionX + b[0] * cos - b[1] * sin; s.by = this.positionY + b[0] * sin + b[1] * cos;
      const length = Math.hypot(s.bx - s.ax, s.by - s.ay);
      s.nx = (s.by - s.ay) / length; s.ny = -(s.bx - s.ax) / length;
    }
  }
  localX(body) { return (body.position.x - this.positionX) * Math.cos(this.rotation) + (body.position.y - this.positionY) * Math.sin(this.rotation); }
  toss(bodies, gesture, time) {
    if (this.cooldown > 0) return 0;
    const c = this.config;
    const strength = clamp((gesture.speed - c.MIN_TOSS_SPEED) / (c.MAX_TOSS_SPEED - c.MIN_TOSS_SPEED), 0, 1);
    const power = c.TOSS_POWER * (c.TOSS_MIN_POWER_RATIO + (1 - c.TOSS_MIN_POWER_RATIO) * strength) * c.TOSS_POWER_MULTIPLIER;
    let count = 0; const nextId = this.tossId + 1;
    for (const body of bodies) {
      if (!body.alive || time - body.lastPanContactTime > c.TOSS_CONTACT_WINDOW) continue;
      const rx = this.localX(body), dy = body.position.y - this.positionY;
      if (Math.abs(rx) > c.POT_WIDTH / 2 + body.radius || dy > c.POT_DEPTH || dy < -c.POT_DEPTH * 1.6) continue;
      const massFactor = 1 / (1 + (body.mass - 1) * c.TOSS_MASS_PENALTY);
      const lift = power * massFactor * (1 + 0.05 * Math.abs(rx) / (c.POT_WIDTH / 2));
      body.velocity.y = -lift * Math.cos(this.rotation);
      body.velocity.x += this.velocityX * c.TOSS_PAN_VELOCITY_FACTOR + gesture.velocityX * c.TOSS_HORIZONTAL_FACTOR + Math.sin(this.rotation) * lift * 0.45 - rx * c.TOSS_CONVERGENCE;
      body.velocity.x = clamp(body.velocity.x, -c.MAX_BODY_SPEED, c.MAX_BODY_SPEED);
      body.position.y -= 4; body.angularVelocity += rx * 0.012; body.tossId = nextId; body.pop = 0.12; count++;
    }
    if (count) { this.tossId = nextId; this.cooldown = c.TOSS_COOLDOWN; this.kick = 0.16; }
    return count;
  }
}
