import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../js/core/Game.js';
import { wxMock } from './helpers/wxMock.mjs';

test('原生 wx 模拟环境能初始化 WebGL、输入和物理，释放时解绑输入', () => {
  const api = wxMock();
  const game = new Game(api, { autoStart: false, raf: () => 0, caf: () => {} });
  for (let i = 0; i < 120; i++) game.loop.advance(1 / 60);
  assert.equal(game.camera.dpr, 2); assert.equal(api.listeners.get('TouchStart').size, 1);
  assert.ok(Number.isFinite(game.world.bodies[0].position.y));
  game.destroy(); assert.equal(api.listeners.get('TouchStart').size, 0);
});
