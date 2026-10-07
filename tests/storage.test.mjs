import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../js/core/Game.js';
import State from '../js/core/GameState.js';
import LocalSaveService from '../js/services/LocalSaveService.js';
import { wxMock } from './helpers/wxMock.mjs';

test('结算只记录一次，再次进入保留最高分、练习状态与设置', () => {
  const api = wxMock(), options = { autoStart: false, raf: () => 0, caf: () => {} };
  const game = new Game(api, options); game.completeTutorial(); game.score.award(500); game.combo.maxCombo = 4; game.runDuration = 20;
  game.local.save({ hapticEnabled: false }); game.finishRun(); game.finishRun();
  assert.equal(game.local.data.totalGames, 1); game.destroy();
  const reopened = new Game(api, options);
  assert.equal(reopened.bestScore, 500); assert.equal(reopened.tutorialCompleted, true); assert.equal(reopened.haptics.enabled, false);
  reopened.start(); assert.equal(reopened.state, State.PLAYING); reopened.destroy();
});
test('损坏存档和存储 API 故障降级，云档案最高值合并', () => {
  const api = wxMock(); api.storage.set('PanToss.save.v1', { bestScore: NaN, bestCombo: -4, soundEnabled: 'false', tutorialCompleted: true });
  const local = new LocalSaveService(api); assert.equal(local.data.bestScore, 0); assert.equal(local.data.soundEnabled, true);
  local.recordRun({ score: 400, maxCombo: 3, recipesCompleted: 1 }); local.mergeProfile({ bestScore: 300, bestCombo: 5, totalGames: 10 });
  assert.equal(local.data.bestScore, 400); assert.equal(local.data.bestCombo, 5); assert.equal(local.data.totalGames, 10);
  api.getStorageSync = () => { throw new Error('不可用'); }; api.setStorageSync = () => { throw new Error('不可用'); };
  const fallback = new LocalSaveService(api); assert.equal(fallback.recordRun({ score: 100, maxCombo: 1, recipesCompleted: 0 }).bestScore, 100);
});
