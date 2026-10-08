import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../js/core/Game.js';
import State from '../js/core/GameState.js';
import config from '../js/config/gameConfig.js';
import SpawnSystem from '../js/systems/SpawnSystem.js';
import { wxMock } from './helpers/wxMock.mjs';

function setup() { const api = wxMock(); return { api, game: new Game(api, { autoStart: false, raf: () => 0, caf: () => {}, seed: 10 }) }; }
const frames = (game, count) => { for (let i = 0; i < count; i++) game.update(config.FIXED_DT); };

test('暂停页返回首页放弃本局，再开清空状态且不提交未结算成绩', () => {
  const { game } = setup(); game.tutorialCompleted = true; game.selectMode('endless'); game.start();
  game.score.award(800); frames(game, 10); game.pause(); let saves = 0;
  game.cloud.saveRunResult = () => { saves++; return Promise.resolve(null); };
  const rect = game.gameOver.pauseLayout(game.camera).menu;
  game.tap({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
  assert.equal(game.state, State.MENU); assert.equal(game.mode, 'endless');
  assert.equal(game.score.score, 100); assert.equal(game.result, null); assert.equal(saves, 0);
  assert.equal(game.local.best('endless'), 0); assert.equal(game.world.bodies.length, 5);
  game.start(); assert.equal(game.state, State.PLAYING); assert.equal(game.runDuration, 0); game.destroy();
});

test('三步练习以实际拖锅、上甩、接锅推进，然后进入正式挑战', () => {
  const { game } = setup(); assert.equal(game.state, State.MENU);
  game.start(); assert.equal(game.state, State.TUTORIAL);
  game.pot.setTarget(500); frames(game, 75); assert.equal(game.tutorial.step, 1);
  game.pot.setTarget(375); frames(game, 75);
  assert.ok(game.toss({ speed: 1500, velocityX: 0 }) > 0); assert.equal(game.tutorial.step, 2);
  game.pot.setTarget(408); frames(game, 70); assert.equal(game.tutorial.step, 3);
  frames(game, 100); assert.equal(game.state, State.PLAYING); assert.equal(game.score.score, 0);
  game.destroy();
});

test('越过锅沿仍可救援，三次真正丢失才结算，重开不增加监听器', () => {
  const { game, api } = setup(); game.tutorialCompleted = true; game.start(); frames(game, 2);
  const first = game.world.bodies[0]; first.position.x = 660; first.position.y = game.pot.baseY - 40;
  game.checkLost(); assert.equal(game.lostCount, 0);
  for (let i = 0; i < 3; i++) { const b = game.world.bodies[0]; b.position.y = game.pot.baseY + config.LOST_DEPTH + b.radius + 1; game.checkLost(); }
  assert.equal(game.lostCount, 3); assert.equal(game.state, State.PLAYING);
  frames(game, 35); assert.equal(game.state, State.GAME_OVER); assert.ok(game.result);
  for (let i = 0; i < 100; i++) { game.start(); assert.equal(game.world.bodies.length, 5); assert.equal(game.score.score, 0); assert.equal(game.combo.count, 0); assert.equal(game.particles.count, 0); assert.equal(game.lostCount, 0); }
  for (const listeners of api.listeners.values()) assert.equal(listeners.size, 1);
  game.destroy(); for (const listeners of api.listeners.values()) assert.equal(listeners.size, 0);
});

test('切后台暂停，返回后等待继续，暂停期间没有物理时间流逝', () => {
  const { game, api } = setup(); game.tutorialCompleted = true; game.start(); frames(game, 15);
  const time = game.world.time; api.emit('Hide'); assert.equal(game.state, State.PAUSED);
  frames(game, 120); api.emit('Show'); assert.equal(game.state, State.PAUSED); assert.equal(game.world.time, time);
  game.resume(); frames(game, 2); assert.ok(game.world.time > time); game.destroy();
});

test('生成器种子可重现，实体达到上限时不会继续增长', () => {
  const { game } = setup(); const a = game.spawner, b = new SpawnSystem(config, game.world, game.camera);
  a.reset(123); b.reset(123); assert.equal(a.nextType, b.nextType); assert.equal(a.nextX, b.nextX);
  while (game.world.bodies.length < config.MAX_INGREDIENTS) game.world.add('egg', 1, 375, 300);
  for (let i = 0; i < 100; i++) a.update(5);
  assert.equal(game.world.bodies.length, config.MAX_INGREDIENTS); game.destroy();
});
