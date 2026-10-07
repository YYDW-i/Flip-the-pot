import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../js/config/gameConfig.js';
import Pot from '../js/entities/Pot.js';
import PhysicsWorld from '../js/physics/PhysicsWorld.js';
import ScoreSystem from '../js/systems/ScoreSystem.js';
import MergeSystem from '../js/systems/MergeSystem.js';

function setup() {
  const world = new PhysicsWorld(config, new Pot(config, 750, 1334)), score = new ScoreSystem(config), merge = new MergeSystem(world, score, config);
  world.onPair = (a, b) => merge.collide(a, b);
  return { world, score, merge };
}
test('三对象同帧碰撞只合成一对，合成保持速度且有冷却', () => {
  const { world, score } = setup();
  for (let i = 0; i < 3; i++) { const b = world.add('tomato', 1, 300 + i * 20, 400); b.mergeCooldown = 0; b.velocity.x = 100; }
  world.step(config.FIXED_DT);
  assert.equal(world.bodies.length, 2); assert.equal(world.bodies.filter(b => b.level === 2).length, 1);
  const upgraded = world.bodies.find(b => b.level === 2);
  assert.ok(upgraded.velocity.x > 90); assert.ok(upgraded.mergeCooldown > 0); assert.equal(score.score, 20);
});
test('不同类型与满级食材不合成，完全重叠仍可稳定分离', () => {
  const { world, score } = setup();
  const a = world.add('egg', 5, 375, 400), b = world.add('egg', 5, 375, 400);
  a.mergeCooldown = 0; b.mergeCooldown = 0;
  for (let i = 0; i < 20; i++) world.step(config.FIXED_DT);
  assert.equal(world.bodies.length, 2); assert.equal(score.score, 0);
  assert.ok(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) > 120);
});
