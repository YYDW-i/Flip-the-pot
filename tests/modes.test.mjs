import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../js/core/Game.js';
import State from '../js/core/GameState.js';
import LocalSaveService from '../js/services/LocalSaveService.js';
import { wxMock } from './helpers/wxMock.mjs';
const options = { autoStart: false, raf: () => 0, caf: () => {}, seed: 12 };
function drop(game, level) {
  const b = game.world.add('tomato', level, 375, game.camera.height + 400);
  game.checkLost(); return b;
}

test('无尽模式没有机会计数，十次掉落达到零分仍继续，负分才结束', () => {
  const game = new Game(wxMock(), options); game.tutorialCompleted = true; game.selectMode('endless'); game.start();
  assert.equal('lostCount' in game, false); assert.equal(game.score.score, 100);
  for (let i = 0; i < 10; i++) drop(game, 1);
  assert.equal(game.score.score, 0); assert.equal(game.endingTime, 0); assert.equal('lostCount' in game, false);
  game.score.award(20); drop(game, 2); assert.equal(game.score.score, 0); assert.equal(game.endingTime, 0);
  drop(game, 3); assert.equal(game.score.score, -40); assert.ok(game.endingTime > 0);
  for (let i = 0; i < 40; i++) game.update(1 / 60);
  assert.equal(game.state, State.GAME_OVER); assert.equal(game.result.score, 100); assert.equal(game.result.finalScore, -40);
  game.start(); assert.equal(game.score.score, 100); assert.equal(game.mode, 'endless'); game.destroy();
});

test('高级食材扣分更多，教程丢失免罚，两个模式的最高分互不污染', () => {
  const api = wxMock(), game = new Game(api, options); game.selectMode('endless'); game.start();
  drop(game, 5); assert.equal(game.score.score, 100); assert.equal(game.endingTime, 0);
  game.completeTutorial(); game.score.award(500); drop(game, 5);
  assert.equal(game.score.score, 440); assert.equal(game.score.peak, 600);
  game.finishRun(); assert.equal(game.bestScore, 600);
  game.setState(State.MENU); game.selectMode('classic'); game.start();
  assert.equal(game.bestScore, 0); assert.equal(game.score.score, 0); assert.equal(game.lostCount, 0);
  game.score.award(250); game.finishRun(); game.destroy();
  const reopened = new Game(api, options); assert.equal(reopened.bestScore, 250);
  reopened.selectMode('endless'); assert.equal(reopened.bestScore, 600); reopened.destroy();
});

test('旧存档只迁移到经典模式，云端模式统计合并保持各自最高分', () => {
  const api = wxMock(); api.storage.set('PanToss.save.v1', { bestScore: 900, bestCombo: 3, totalGames: 5 });
  const local = new LocalSaveService(api); assert.equal(local.best('classic'), 900); assert.equal(local.best('endless'), 0);
  local.recordRun({ mode: 'endless', score: 1200, maxCombo: 5, recipesCompleted: 1 });
  local.mergeProfile({ bestScore: 1500, modes: { classic: { bestScore: 700 }, endless: { bestScore: 1500 } } });
  const fresh = new LocalSaveService(api); assert.equal(fresh.best('classic'), 900); assert.equal(fresh.best('endless'), 1500);
});
