import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../js/config/gameConfig.js';
import Pot from '../js/entities/Pot.js';
import PhysicsWorld from '../js/physics/PhysicsWorld.js';
import GameLoop from '../js/core/GameLoop.js';
import GestureDetector from '../js/input/GestureDetector.js';

test('番茄持续落锅不穿透，轻重颠锅高度不同，飞行时仍能移动锅', () => {
  const pot = new Pot(config, 750, 1334), world = new PhysicsWorld(config, pot);
  const body = world.add('tomato', 1, 375, pot.positionY - 80);
  for (let i = 0; i < 300; i++) world.step(config.FIXED_DT);
  assert.ok(Math.abs(body.position.y - (pot.positionY + config.POT_BOTTOM_Y - body.radius)) < 2);
  const startY = body.position.y;
  assert.equal(pot.toss(world.bodies, { speed: 400, velocityX: 0 }, world.time), 1);
  let lightY = startY;
  for (let i = 0; i < 90; i++) { world.step(config.FIXED_DT); lightY = Math.min(lightY, body.position.y); }
  assert.equal(pot.toss(world.bodies, { speed: 2000, velocityX: 0 }, world.time), 1);
  let strongY = startY; pot.setTarget(510);
  for (let i = 0; i < 35; i++) { world.step(config.FIXED_DT); strongY = Math.min(strongY, body.position.y); }
  assert.ok(strongY < lightY - 130); assert.ok(pot.positionX > 480);
});

test('固定时间步在 30/60/120 FPS 下等效，恢复时限制帧间隔', () => {
  const run = fps => { let ticks = 0; const loop = new GameLoop(config, () => ticks++, () => {}, () => 0, () => {}); for (let i = 0; i < fps * 2; i++) loop.advance(1 / fps); return ticks; };
  assert.equal(run(30), 120); assert.equal(run(60), 120); assert.equal(run(120), 120);
  let ticks = 0; const loop = new GameLoop(config, () => ticks++, () => {}, () => 0, () => {}); loop.advance(60); assert.equal(ticks, 3);
});

test('识别连续力度的上甩，同一上甩不重复触发', () => {
  const gesture = new GestureDetector(config); gesture.start({ x: 350, y: 1100 }, 1);
  const result = gesture.move({ x: 370, y: 1000 }, 1.08);
  assert.ok(result.toss.speed > 1000); assert.equal(gesture.move({ x: 380, y: 930 }, 1.12).toss, null);
});

test('一至五级食材都能颠起，二三级普通甩动有明显腾空高度', () => {
  for (let level = 1; level <= 5; level++) {
    const pot = new Pot(config, 750, 1334), world = new PhysicsWorld(config, pot);
    const body = world.add('egg', level, 375, pot.baseY - 90);
    for (let i = 0; i < 150; i++) world.step(config.FIXED_DT);
    const y = body.position.y; let peakY = y;
    assert.equal(pot.toss(world.bodies, { speed: 1200, velocityX: 0 }, world.time), 1);
    for (let i = 0; i < 60; i++) { world.step(config.FIXED_DT); peakY = Math.min(peakY, body.position.y); }
    assert.ok(y - peakY > (level <= 3 ? 180 : 100), '等级 ' + level + ' 腾空高度 ' + (y - peakY));
  }
});

test('真实叠放的二三级食材随底层一起颠起，不吸附空中与锅外食材', () => {
  const pot = new Pot(config, 750, 1334), world = new PhysicsWorld(config, pot);
  [2, 3, 1].forEach((level, i) => world.add(config.TYPES[i].id, level, 375, pot.baseY - 40 - i * 85));
  for (let i = 0; i < 300; i++) world.step(config.FIXED_DT);
  assert.ok(world.time - world.bodies[1].lastPanContactTime > 1);
  const outside = world.add('egg', 3, 650, pot.baseY - 20);
  const flying = world.add('egg', 3, 375, pot.baseY - 220); flying.velocity.y = -800;
  const below = world.add('egg', 2, 375, pot.baseY + 80); below.lastPanContactTime = world.time;
  assert.equal(pot.toss(world.bodies.slice().reverse(), { speed: 1500, velocityX: 0 }, world.time), 3);
  assert.equal(outside.tossId, 0); assert.equal(flying.tossId, 0); assert.equal(below.tossId, 0);
  for (const b of world.bodies.slice(0, 3)) assert.ok(b.velocity.y < -1000);
  assert.equal(pot.toss(world.bodies, { speed: 1500, velocityX: 0 }, world.time), 0);
});
