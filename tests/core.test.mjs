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
