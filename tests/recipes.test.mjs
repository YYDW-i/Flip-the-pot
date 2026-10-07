import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../js/config/gameConfig.js';
import Pot from '../js/entities/Pot.js';
import PhysicsWorld from '../js/physics/PhysicsWorld.js';
import ScoreSystem from '../js/systems/ScoreSystem.js';
import ComboSystem from '../js/systems/ComboSystem.js';
import RecipeSystem from '../js/systems/RecipeSystem.js';

test('订单要求等级与明显碰撞，完成后消耗食材并切换订单', () => {
  const world = new PhysicsWorld(config, new Pot(config, 750, 1334)), score = new ScoreSystem(config);
  const recipe = new RecipeSystem(world, score, new ComboSystem(config), config); world.onPair = (a, b) => recipe.collide(a, b);
  const a = world.add('tomato', 3, 350, 400), b = world.add('egg', 3, 400, 400); a.mergeCooldown = b.mergeCooldown = 0;
  assert.equal(recipe.collide(a, b), false);
  a.velocity.x = 160; b.velocity.x = -160; world.step(config.FIXED_DT);
  assert.equal(world.bodies.length, 0); assert.equal(score.score, 300); assert.equal(score.recipesCompleted, 1);
  assert.equal(recipe.current.name, '蘑菇煎蛋');
});
test('空中完成订单有额外奖励，低等级不能完成料理', () => {
  const world = new PhysicsWorld(config, new Pot(config, 750, 1334)), score = new ScoreSystem(config);
  const recipe = new RecipeSystem(world, score, new ComboSystem(config), config); world.onPair = (a, b) => recipe.collide(a, b); world.time = 1;
  const a = world.add('tomato', 2, 350, 400), b = world.add('egg', 3, 400, 400);
  a.mergeCooldown = b.mergeCooldown = 0; a.velocity.x = 160; b.velocity.x = -160;
  a.airborne = b.airborne = true; assert.equal(recipe.collide(a, b), false);
  a.level = 3; world.step(config.FIXED_DT); assert.equal(score.score, 450); assert.equal(score.recipesCompleted, 1);
});
