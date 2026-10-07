import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../js/config/gameConfig.js';
import Pot from '../js/entities/Pot.js';
import PhysicsWorld from '../js/physics/PhysicsWorld.js';
import ScoreSystem from '../js/systems/ScoreSystem.js';
import MergeSystem from '../js/systems/MergeSystem.js';
import ComboSystem from '../js/systems/ComboSystem.js';
import SaveSystem from '../js/systems/SaveSystem.js';
import ParticleSystem from '../js/systems/ParticleSystem.js';
import Random from '../js/utils/Random.js';

test('空中合成按双倍与连击倍率计分，接触锅后不判空中合成', () => {
  const world = new PhysicsWorld(config, new Pot(config, 750, 1334)), score = new ScoreSystem(config), combo = new ComboSystem(config);
  const merge = new MergeSystem(world, score, config, combo); world.onPair = (a, b) => merge.collide(a, b); world.time = 1;
  const pair = type => {
    for (let i = 0; i < 2; i++) { const b = world.add(type, 1, 350 + i * 20, 400); b.airborne = true; b.lastPanContactTime = 0; b.mergeCooldown = 0; }
    world.step(config.FIXED_DT);
  };
  pair('tomato'); assert.equal(score.score, 40);
  pair('egg'); assert.equal(score.score, 100); assert.equal(combo.count, 2); assert.equal(combo.airStreak, 2);
  combo.update(world.time + 2, 1 / 60); assert.equal(combo.count, 0);
  const a = world.add('mushroom', 1, 600, 400), b = world.add('mushroom', 1, 620, 400);
  a.airborne = b.airborne = true; a.lastPanContactTime = world.time;
  a.mergeCooldown = b.mergeCooldown = 0;
  let isAir = true; merge.onMerge = (_, __, air) => { isAir = air; };
  world.step(config.FIXED_DT); assert.equal(isAir, false);
});

test('移动锅接住曾处于边缘危险的食材才能获得救球奖励', () => {
  const pot = new Pot(config, 750, 1334), world = new PhysicsWorld(config, pot), score = new ScoreSystem(config), save = new SaveSystem(config, pot, score);
  world.time = 1;
  const body = world.add('egg', 1, 565, pot.baseY - 170); body.velocity.y = 300; body.airborne = true;
  world.onLand = (b, _, index) => save.land(b, index, world.time);
  save.update(world.bodies, world.time); assert.ok(body.danger);
  pot.setTarget(510);
  for (let i = 0; i < 90; i++) { save.update(world.bodies, world.time); world.step(config.FIXED_DT); }
  assert.equal(score.score, config.SAVE_SCORE);
});

test('粒子与浮字数量有上限，生命周期结束后回收', () => {
  const p = new ParticleSystem(config, new Random(1));
  for (let i = 0; i < 50; i++) { p.burst(0, 0, [1, 1, 1, 1], 30); p.text('+10', 0, 0); p.ring(0, 0, 10, [1, 1, 1, 1]); }
  assert.equal(p.count, config.MAX_PARTICLES); assert.equal(p.texts.length, config.MAX_FLOAT_TEXTS); assert.equal(p.rings.length, config.MAX_RINGS);
  p.update(2); assert.equal(p.count, 0); assert.equal(p.texts.length, 0); assert.equal(p.rings.length, 0);
});
