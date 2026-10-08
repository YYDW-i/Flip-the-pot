import test from 'node:test';
import assert from 'node:assert/strict';
import Game from '../js/core/Game.js';
import State from '../js/core/GameState.js';
import UserInfoService from '../js/services/UserInfoService.js';
import LeaderboardService from '../js/services/LeaderboardService.js';
import { wxMock } from './helpers/wxMock.mjs';
import { cloudMock } from './helpers/cloudMock.mjs';
const options = { autoStart: false, raf: () => 0, caf: () => {} };
function authMock(api = wxMock()) {
  const buttons = [];
  api.requirePrivacyAuthorize = options => options.success();
  api.createUserInfoButton = options => {
    const button = { options, visible: false, destroyed: false, onTap(fn) { this.callback = fn; }, offTap() { this.callback = null; },
      show() { this.visible = true; }, destroy() { this.destroyed = true; } };
    buttons.push(button); return button;
  };
  return { api, buttons };
}

test('仅主动点击准备授权，原生按钮按窗口像素定位，成功只返回昵称', () => {
  const { api, buttons } = authMock(), service = new UserInfoService(api), identities = [], messages = [];
  assert.equal(buttons.length, 0);
  service.prepare({ x: 160, y: 500, w: 430, h: 54 }, { scale: 0.5 }, msg => messages.push(msg), nick => identities.push(nick));
  assert.equal(buttons[0].options.style.left, 80); assert.equal(buttons[0].options.style.width, 215); assert.equal(buttons[0].options.withCredentials, false);
  buttons[0].callback({ userInfo: { nickName: '小厨', avatarUrl: 'ignored', city: 'ignored' } });
  assert.deepEqual(identities, ['小厨']); assert.equal(buttons[0].destroyed, true); assert.equal(service.phase, 'idle'); service.destroy();
});

test('隐私或资料授权拒绝不会提交，关闭/切后台忽略迟到授权回调', () => {
  const { api, buttons } = authMock(), service = new UserInfoService(api); let submitted = 0, ready;
  const args = [{ x: 0, y: 0, w: 200, h: 60 }, { scale: 1 }, () => {}, () => submitted++];
  api.requirePrivacyAuthorize = options => options.fail(); service.prepare(...args); assert.equal(buttons.length, 0);
  api.requirePrivacyAuthorize = options => options.success(); service.prepare(...args); buttons[0].callback({ errMsg: 'deny' }); assert.equal(submitted, 0);
  api.requirePrivacyAuthorize = options => { ready = options.success; }; service.prepare(...args); service.clear(); ready(); assert.equal(buttons.length, 1);
  api.requirePrivacyAuthorize = options => options.success(); service.prepare(...args); const late = buttons[1].callback; service.destroy();
  late({ userInfo: { nickName: '迟到' } }); assert.equal(submitted, 0); assert.equal(buttons[1].destroyed, true);
});

test('不支持授权 API 时安全降级，关闭榜单不会重置当前游戏模式', async () => {
  const game = new Game(wxMock(), options); game.selectMode('endless'); await game.loadLeaderboard('classic');
  assert.equal(game.board.phase, 'offline'); game.authorizeNickname(); assert.match(game.board.authMessage, /连接/);
  game.closeLeaderboard(); assert.equal(game.mode, 'endless'); game.start(); assert.equal(game.score.score, 100); game.destroy();
});

test('快速切换榜单与退出页面时丢弃过时响应，运行错误数据不传给绘制层', async () => {
  const game = new Game(wxMock(), options); const resolves = [];
  game.leaderboard.getEntries = () => new Promise(resolve => resolves.push(resolve));
  const first = game.loadLeaderboard('classic'), second = game.loadLeaderboard('endless');
  resolves[0]({ entries: [{ nickname: '旧响应' }], mine: null }); await first;
  assert.equal(game.board.mode, 'endless'); assert.equal(game.board.phase, 'loading');
  resolves[1]({ entries: [], mine: { score: 100 } }); await second; assert.equal(game.board.phase, 'ready');
  const third = game.loadLeaderboard(); game.closeLeaderboard(); resolves[2]({ entries: [] }); await third; assert.equal(game.leaderboardOpen, false); game.destroy();
  const service = new LeaderboardService({ available: true, call: async () => ({ entries: [null, { rank: 1, score: Infinity }, { rank: 2, score: 100, nickname: '厨师' }], mine: null }) });
  assert.equal((await service.getEntries('classic')).entries.length, 1);
});

test('小游戏到云函数整条流程：无尽最高分、本人排名、授权昵称、关闭按钮', async () => {
  const { api, buttons } = authMock(), mock = cloudMock();
  const handlers = Object.fromEntries(['getLeaderboard', 'saveRunResult', 'updatePlayerIdentity'].map(name => [name, mock.load(name)]));
  api.cloud = { init() {}, callFunction: ({ name, data }) => handlers[name](data).then(result => ({ result })) };
  const game = new Game(api, options); game.cloud.envId = 'test-env'; await game.cloud.init();
  game.selectMode('endless'); game.completeTutorial(); game.score.award(500); game.score.lose(5); game.runDuration = 20; game.finishRun();
  // 等待事务响应，再打开本人榜。
  for (let i = 0; i < 10; i++) await Promise.resolve();
  game.setState(State.MENU); await game.loadLeaderboard('endless');
  assert.equal(game.board.entries[0].score, 600); assert.equal(game.board.mine.rank, 1);
  game.authorizeNickname(); buttons[0].callback({ userInfo: { nickName: '颠锅高手' } });
  for (let i = 0; i < 30; i++) await Promise.resolve();
  assert.equal(mock.docs.get('players/trusted-user').nickname, '颠锅高手'); assert.equal(game.nickname, '颠锅高手');
  assert.equal(game.board.entries[0].nickname, '颠锅高手'); assert.equal(game.board.entries[0].isMe, true);
  game.authorizeNickname(); api.emit('Hide'); assert.equal(buttons[1].destroyed, true);
  game.destroy();
});
