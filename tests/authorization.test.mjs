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

test('原生按钮按窗口像素定位，单次确认成功只返回昵称', () => {
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
  assert.equal(game.board.phase, 'offline'); assert.equal(game.nicknamePrompt.open, false);
  game.promptNickname(true); assert.match(game.nicknamePrompt.message, /不支持/); game.dismissNicknamePrompt();
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

test('小游戏到云函数整条流程：首次确认昵称、无尽最高分和本人排名', async () => {
  const { api, buttons } = authMock(), mock = cloudMock();
  const handlers = Object.fromEntries(['getPlayerProfile', 'getGameConfig', 'getLeaderboard', 'saveRunResult', 'updatePlayerIdentity'].map(name => [name, mock.load(name)]));
  api.cloud = { init() {}, callFunction: ({ name, data }) => handlers[name](data).then(result => ({ result })) };
  const game = new Game(api, options);
  assert.equal(game.nicknamePrompt.open, true); assert.equal(buttons.length, 1);
  buttons[0].callback({ userInfo: { nickName: '颠锅高手' } });
  await game.bootstrapPromise;
  for (let i = 0; i < 30; i++) await Promise.resolve();
  assert.equal(game.nicknamePrompt.open, false); assert.equal(game.nickname, '颠锅高手');
  game.selectMode('endless'); game.completeTutorial(); game.score.award(500); game.score.lose(5); game.runDuration = 20; game.finishRun();
  // 等待事务响应，再打开本人榜。
  for (let i = 0; i < 10; i++) await Promise.resolve();
  game.setState(State.MENU); await game.loadLeaderboard('endless');
  assert.equal(game.board.entries[0].score, 600); assert.equal(game.board.mine.rank, 1);
  assert.equal(mock.docs.get('players/trusted-user').nickname, '颠锅高手'); assert.equal(game.nickname, '颠锅高手');
  assert.equal(game.board.entries[0].nickname, '颠锅高手'); assert.equal(game.board.entries[0].isMe, true);
  game.promptNickname(true); api.emit('Hide'); assert.equal(buttons[1].destroyed, true);
  api.emit('Show'); assert.equal(buttons.length, 3); assert.equal(buttons[2].visible, true);
  game.destroy();
});

test('首次进入自动引导，拒绝后不再反复弹窗，设置可重新发起', async () => {
  const { api, buttons } = authMock(); let privacyCalls = 0;
  api.requirePrivacyAuthorize = opts => { privacyCalls++; opts.success(); };
  const game = new Game(api, options);
  assert.equal(privacyCalls, 1); assert.equal(buttons.length, 1);
  const start = game.menu.layout(game.camera).start;
  game.tap({ x: start.x + 1, y: start.y + 1 }); assert.equal(game.state, State.MENU);
  const late = buttons[0].callback;
  buttons[0].callback({ errMsg: 'deny' }); assert.equal(game.nicknamePrompt.open, false);
  assert.equal(api.storage.get('PanToss.save.v1').nicknamePromptHandled, true);
  late({ userInfo: { nickName: '迟到授权' } }); assert.equal(game.local.data.pendingNickname, '');
  game.destroy();
  const next = new Game(api, options); await next.bootstrapPromise;
  assert.equal(next.nicknamePrompt.open, false); assert.equal(privacyCalls, 1);
  next.settingsOpen = true; const rect = next.menu.settingsLayout(next.camera).nickname;
  next.tap({ x: rect.x + 1, y: rect.y + 1 }); assert.equal(next.nicknamePrompt.open, true); assert.equal(privacyCalls, 2);
  next.destroy();
});

test('隐私拒绝直接匿名进入，不创建原生昵称按钮', () => {
  const { api, buttons } = authMock(); api.requirePrivacyAuthorize = opts => opts.fail();
  const game = new Game(api, options);
  assert.equal(buttons.length, 0); assert.equal(game.nicknamePrompt.open, false);
  assert.equal(game.local.data.nicknamePromptHandled, true); game.destroy();
});

test('已同意昵称在保存失败后保留重试，重新进入无需重复授权', async () => {
  const { api, buttons } = authMock(), game = new Game(api, options);
  await game.bootstrapPromise;
  game.leaderboard.updateIdentity = async () => null;
  buttons[0].callback({ userInfo: { nickName: '等待联网的小厨' } });
  for (let i = 0; i < 5; i++) await Promise.resolve();
  assert.equal(game.local.data.pendingNickname, '等待联网的小厨'); assert.match(game.nicknamePrompt.message, /保存失败/);
  game.dismissNicknamePrompt(); game.destroy();
  const next = new Game(api, options); let submitted;
  next.leaderboard.updateIdentity = async nickname => { submitted = nickname; return { nickname }; };
  await next.bootstrapPromise;
  for (let i = 0; i < 5; i++) await Promise.resolve();
  assert.equal(submitted, '等待联网的小厨'); assert.equal(next.nickname, submitted);
  assert.equal(next.local.data.pendingNickname, ''); assert.equal(buttons.length, 1); next.destroy();
});

test('窗口变化重建昵称按钮，销毁及切后台忽略迟到结果', () => {
  const { api, buttons } = authMock(), game = new Game(api, options); let saves = 0;
  game.leaderboard.updateIdentity = async () => { saves++; return null; };
  const late = buttons[0].callback; game.resize(); assert.equal(buttons[0].destroyed, true);
  late({ userInfo: { nickName: '旧按钮' } }); assert.equal(saves, 0); assert.equal(buttons[1].visible, true);
  const hidden = buttons[1].callback; api.emit('Hide'); hidden({ userInfo: { nickName: '后台按钮' } });
  assert.equal(saves, 0); game.destroy();
});

test('结算立即打开排行榜，会等成绩成功写入再读取', async () => {
  const game = new Game(wxMock(), options); await game.bootstrapPromise;
  let saveDone, reads = 0;
  game.cloud.saveRunResult = () => new Promise(resolve => { saveDone = resolve; });
  game.leaderboard.getEntries = async () => { reads++; return { entries: [], mine: null }; };
  game.start(); game.finishRun(); game.returnHome();
  const loading = game.loadLeaderboard('classic'); assert.equal(reads, 0);
  saveDone({ bestScore: 100 }); await loading;
  assert.equal(reads, 1); assert.equal(game.board.phase, 'ready'); assert.equal(game.runSyncState, 'ready'); game.destroy();
});
