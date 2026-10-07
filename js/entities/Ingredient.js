export default class Ingredient {
  constructor(id, type, level, x, y, config) {
    const spec = config.LEVELS[level - 1];
    this.id = id; this.type = type; this.level = level;
    this.position = { x, y }; this.velocity = { x: 0, y: 0 };
    this.previousX = x; this.previousY = y;
    this.radius = spec.radius; this.mass = spec.mass;
    this.restitution = config.INGREDIENT_RESTITUTION; this.friction = config.INGREDIENT_FRICTION;
    this.rotation = 0; this.angularVelocity = 0; this.alive = true; this.airborne = false;
    this.lastPanContactTime = 0; this.mergeCooldown = config.INITIAL_MERGE_COOLDOWN;
    this.squash = 0; this.pop = 0; this.dangerTime = 0; this.lastSaveTime = -10;
    this.tossId = 0;
  }
}
