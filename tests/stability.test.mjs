import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../js/config/gameConfig.js';
import Pot from '../js/entities/Pot.js';
import PhysicsWorld from '../js/physics/PhysicsWorld.js';
import Random from '../js/utils/Random.js';
import { circleSegment } from '../js/physics/Collision.js';
import Camera from '../js/rendering/Camera.js';
import PrimitiveBatch from '../js/rendering/PrimitiveBatch.js';
import { wxMock } from './helpers/wxMock.mjs';

test('跨越锅底的内侧食材被分离回锅内，外侧食材不被吸附', () => {
  const pot = new Pot(config, 750, 1334), world = new PhysicsWorld(config, pot), floor = pot.segments[1];
  const body = world.add('egg', 1, 375, floor.ay + 10); body.previousY = floor.ay - 24; body.velocity.y = 2000;
  circleSegment(body, floor, pot, config); assert.ok(body.position.y <= floor.ay - body.radius);
  body.position.y = floor.ay + 40; body.previousY = floor.ay + 40;
  assert.equal(circleSegment(body, floor, pot, config), -1); assert.equal(body.position.y, floor.ay + 40);
});

test('30 个不同等级食材高速拖锅和颠锅持续模拟，不出现 NaN 或数组增长', () => {
  const pot = new Pot(config, 750, 1334), world = new PhysicsWorld(config, pot), random = new Random(99);
  for (let i = 0; i < 30; i++) world.add(config.TYPES[i % 3].id, i % 5 + 1, 150 + (i % 6) * 90, 300 + Math.floor(i / 6) * 115);
  for (let i = 0; i < 3600; i++) {
    if (i % 30 === 0) pot.setTarget(random.range(235, 515), random.range(-2300, 2300));
    if (i % 60 === 0) pot.toss(world.bodies, { speed: random.range(300, 2100), velocityX: random.range(-700, 700) }, world.time);
    world.step(config.FIXED_DT);
  }
  assert.equal(world.bodies.length, 30); assert.equal(world.pending.length, 0);
  for (const b of world.bodies) assert.ok(Number.isFinite(b.position.x + b.position.y + b.velocity.x + b.velocity.y));
});

test('多设备 DPR 与安全区适配，几何批次溢出时不切断三角形', () => {
  const api = wxMock(), camera = new Camera(api.createCanvas(), config, api);
  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [768, 1024]]) {
    camera.resize({ windowWidth: w, windowHeight: h, pixelRatio: 3, safeArea: { top: 24, bottom: h - 20 } });
    assert.equal(camera.width, 750); assert.equal(camera.dpr, 2); assert.ok(camera.safeBottom > 0);
    assert.ok(Math.abs(camera.toWorld(w / 2, h / 2).x - 375) < 0.01);
  }
  const counts = []; api.gl.drawArrays = (_, __, count) => counts.push(count);
  const batch = new PrimitiveBatch(api.gl); batch.begin(750, 1334);
  for (let i = 0; i < 13000; i++) batch.triangle(0, 0, 1, 0, 0, 1);
  batch.flush(); assert.equal(counts.reduce((a, b) => a + b, 0), 39000);
  for (const count of counts) assert.equal(count % 3, 0); batch.destroy();
});
