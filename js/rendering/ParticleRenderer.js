export default class ParticleRenderer {
  constructor() { this.color = [1, 1, 1, 1]; }
  render(batch, particles) {
    const color = this.color;
    for (let i = 0; i < particles.count; i++) {
      const p = particles.pool[i]; color[0] = p.color[0]; color[1] = p.color[1]; color[2] = p.color[2]; color[3] = p.life / p.ttl;
      batch.ellipse(p.x, p.y, p.radius, p.radius, color, 16);
    }
    for (const ring of particles.rings) {
      const progress = 1 - ring.life / ring.ttl, radius = ring.radius * (1 + progress * 2);
      color[0] = ring.color[0]; color[1] = ring.color[1]; color[2] = ring.color[2]; color[3] = (1 - progress) * 0.65;
      for (let i = 0; i < 32; i++) {
        const a = batch.unitCircle[i], b = batch.unitCircle[i + 1];
        batch.line(ring.x + a[0] * radius, ring.y + a[1] * radius, ring.x + b[0] * radius, ring.y + b[1] * radius, 3, color);
      }
    }
  }
}
