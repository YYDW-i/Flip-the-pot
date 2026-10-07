import { clamp } from '../utils/MathUtils.js';

export function circlesOverlap(a, b) {
  const dx = b.position.x - a.position.x, dy = b.position.y - a.position.y, radius = a.radius + b.radius;
  return dx * dx + dy * dy <= radius * radius;
}

export function circleCircle(a, b, config) {
  let nx = b.position.x - a.position.x, ny = b.position.y - a.position.y;
  const distance = Math.hypot(nx, ny);
  if (distance > 0.001) { nx /= distance; ny /= distance; } else { nx = a.id < b.id ? 1 : -1; ny = 0; }
  const invA = 1 / a.mass, invB = 1 / b.mass, inverseMass = invA + invB;
  const correction = Math.max(0, a.radius + b.radius - distance - config.CONTACT_SLOP) * 0.85 / inverseMass;
  a.position.x -= nx * correction * invA; a.position.y -= ny * correction * invA;
  b.position.x += nx * correction * invB; b.position.y += ny * correction * invB;
  const vx = b.velocity.x - a.velocity.x, vy = b.velocity.y - a.velocity.y;
  const speed = vx * nx + vy * ny;
  if (speed >= 0) return 0;
  const restitution = Math.abs(speed) < 80 ? 0 : Math.min(a.restitution, b.restitution);
  const impulse = -(1 + restitution) * speed / inverseMass;
  a.velocity.x -= impulse * nx * invA; a.velocity.y -= impulse * ny * invA;
  b.velocity.x += impulse * nx * invB; b.velocity.y += impulse * ny * invB;
  const friction = clamp(-(vx * -ny + vy * nx) / inverseMass, -impulse * a.friction, impulse * a.friction);
  a.velocity.x -= friction * -ny * invA; a.velocity.y -= friction * nx * invA;
  b.velocity.x += friction * -ny * invB; b.velocity.y += friction * nx * invB;
  a.angularVelocity -= friction / a.radius * 0.08; b.angularVelocity += friction / b.radius * 0.08;
  return -speed;
}

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
