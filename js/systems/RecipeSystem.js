import recipes from '../config/recipes.js';
import { circlesOverlap } from '../physics/Collision.js';

export default class RecipeSystem {
  constructor(world, score, combo, config) { this.world = world; this.score = score; this.combo = combo; this.config = config; this.onRecipe = () => {}; this.reset(); }
  reset() { this.index = 0; this.current = recipes[0]; }
  matches(a, b) {
    const [first, second] = this.current.ingredients;
    const match = (body, need) => body.type === need.type && body.level >= need.level;
    return (match(a, first) && match(b, second)) || (match(a, second) && match(b, first));
  }
  collide(a, b) {
    if (!a.alive || !b.alive || a.mergeCooldown > 0 || b.mergeCooldown > 0 || !this.matches(a, b) || !circlesOverlap(a, b)) return false;
    const dx = b.position.x - a.position.x, dy = b.position.y - a.position.y, distance = Math.hypot(dx, dy);
    const vx = b.velocity.x - a.velocity.x, vy = b.velocity.y - a.velocity.y;
    const closing = distance > 0.001 ? -(vx * dx + vy * dy) / distance : Math.hypot(vx, vy);
    if (closing < this.config.RECIPE_COLLISION_SPEED) return false;
    const air = a.airborne && b.airborne && this.world.time - Math.max(a.lastPanContactTime, b.lastPanContactTime) >= this.config.AIR_CONTACT_DELAY;
    const multiplier = this.combo.add(this.world.time, air) * (air ? this.config.RECIPE_AIR_MULTIPLIER : 1);
    const recipe = this.current, points = this.score.recipe(recipe.score, multiplier);
    const mass = a.mass + b.mass, x = (a.position.x * a.mass + b.position.x * b.mass) / mass, y = (a.position.y * a.mass + b.position.y * b.mass) / mass;
    a.alive = false; b.alive = false;
    this.index = (this.index + 1) % recipes.length; this.current = recipes[this.index];
    this.onRecipe(recipe, x, y, points, air);
    return true;
  }
}
