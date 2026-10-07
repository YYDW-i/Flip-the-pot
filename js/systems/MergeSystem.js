export default class MergeSystem {
  constructor(world, score, config) { this.world = world; this.score = score; this.config = config; this.onMerge = () => {}; }
  collide(a, b) {
    if (!a.alive || !b.alive || a.type !== b.type || a.level !== b.level || a.level >= this.config.MAX_LEVEL || a.mergeCooldown > 0 || b.mergeCooldown > 0) return false;
    const mass = a.mass + b.mass;
    const x = (a.position.x * a.mass + b.position.x * b.mass) / mass;
    const y = (a.position.y * a.mass + b.position.y * b.mass) / mass;
    a.alive = false; b.alive = false;
    const body = this.world.queue(a.type, a.level + 1, x, y);
    if (!body) throw new Error('PanToss 合成后没有可用实体容量');
    body.velocity.x = (a.velocity.x * a.mass + b.velocity.x * b.mass) / mass;
    body.velocity.y = (a.velocity.y * a.mass + b.velocity.y * b.mass) / mass;
    body.angularVelocity = (a.angularVelocity + b.angularVelocity) / 2;
    body.lastPanContactTime = Math.max(a.lastPanContactTime, b.lastPanContactTime);
    body.airborne = a.airborne && b.airborne; body.mergeCooldown = this.config.MERGE_COOLDOWN;
    body.tossId = Math.max(a.tossId, b.tossId); body.pop = 0.28;
    const points = this.score.merge(body.level);
    this.onMerge(body, points);
    return true;
  }
}
