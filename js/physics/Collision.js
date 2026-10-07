import { clamp } from '../utils/MathUtils.js';

export function circleSegment(body, segment, pot, config) {
  const dx = segment.bx - segment.ax, dy = segment.by - segment.ay;
  const t = clamp(((body.position.x - segment.ax) * dx + (body.position.y - segment.ay) * dy) / (dx * dx + dy * dy), 0, 1);
  const x = segment.ax + dx * t, y = segment.ay + dy * t;
  let nx = body.position.x - x, ny = body.position.y - y;
  const distance = Math.hypot(nx, ny);
  if (distance > body.radius + config.CONTACT_SLOP) return -1;
  if (distance > 0.001) { nx /= distance; ny /= distance; } else { nx = segment.nx; ny = segment.ny; }
  const penetration = body.radius - distance;
  if (penetration > 0) { body.position.x += nx * penetration; body.position.y += ny * penetration; }
  const panVX = pot.velocityX - pot.angularVelocity * (y - pot.positionY);
  const panVY = pot.velocityY + pot.angularVelocity * (x - pot.positionX);
  const rvx = body.velocity.x - panVX, rvy = body.velocity.y - panVY;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    const restitution = Math.abs(vn) < 110 ? 0 : body.restitution;
    const impulse = -(1 + restitution) * vn;
    body.velocity.x += impulse * nx; body.velocity.y += impulse * ny;
    const tangent = rvx * -ny + rvy * nx;
    const friction = clamp(-tangent, -impulse * body.friction, impulse * body.friction);
    body.velocity.x += friction * -ny; body.velocity.y += friction * nx;
    body.angularVelocity += friction / body.radius * 0.08;
  }
  return Math.max(0, -vn);
}
