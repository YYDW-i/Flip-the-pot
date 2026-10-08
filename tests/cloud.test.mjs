import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudMock } from './helpers/cloudMock.mjs';
import CloudService from '../js/services/CloudService.js';
import { validateRemoteConfig } from '../js/config/remoteConfig.js';
import config from '../js/config/gameConfig.js';
import { wxMock } from './helpers/wxMock.mjs';
import Game from '../js/core/Game.js';
import LeaderboardService from '../js/services/LeaderboardService.js';

test('云环境占位、初始化抛错和请求超时均降级', async () => {
  const api = wxMock(); let calls = 0;
  api.cloud = { init: () => {}, callFunction: () => { calls++; } };
  assert.equal((await new CloudService(api, 'YOUR_CLOUD_ENV_ID').bootstrap()).profile, null); assert.equal(calls, 0);
  const service = new CloudService(api, 'test-env', 5); assert.equal((await service.bootstrap()).profile, null); assert.equal(calls, 2);
  api.cloud.init = () => { throw new Error('云不可用'); }; assert.equal(await new CloudService(api, 'test-env', 5).init(), false);
  api.cloud.init = () => new Promise(() => {}); assert.equal(await new CloudService(api, 'test-env', 5).init(), false);
});

test('远程配置拒绝异常数值，最小生成间隔不超过基础间隔', () => {
  const patch = validateRemoteConfig({ gravity: Infinity, spawnInterval: 2, minimumSpawnInterval: 4, tossPowerMultiplier: 500, comboWindow: '1', maxIngredientCount: 100000 }, config);
  assert.deepEqual(patch, { SPAWN_INTERVAL: 2, MIN_SPAWN_INTERVAL: 2 });
  assert.equal(validateRemoteConfig({ gravity: 2400 }, config).GRAVITY, 2400);
});

test('服务端使用真实 OPENID，校验异常结果，重复结果只记一局', async () => {
  const mock = cloudMock(), get = mock.load('getPlayerProfile'), save = mock.load('saveRunResult');
  assert.equal((await get({ openid: 'forged' })).profile.bestScore, 0);
  const run = { runId: 'run-1', openid: 'forged', score: 400, maxCombo: 4, duration: 30, recipesCompleted: 1 };
  const response = await save(run); assert.equal(response.profile.bestScore, 400);
  assert.equal((await save(run)).profile.totalGames, 1); assert.ok(mock.docs.has('players/trusted-user')); assert.equal(mock.docs.has('players/forged'), false);
  const before = mock.writes;
  for (const patch of [{ score: Infinity }, { score: -1 }, { maxCombo: 5000 }, { duration: 0 }, { duration: 999999 }, { recipesCompleted: -2 }, { runId: '../oops' }]) assert.equal((await save({ ...run, ...patch })).code, 'INVALID_RUN');
  assert.equal(mock.writes, before);
});

test('并发档案读取不覆盖结算，最高值单调增加，数据库故障不写空档案', async () => {
  const mock = cloudMock(), get = mock.load('getPlayerProfile'), save = mock.load('saveRunResult');
  await Promise.all([get(), save({ runId: 'one', score: 800, maxCombo: 5, duration: 20, recipesCompleted: 2 }), get(), save({ runId: 'two', score: 200, maxCombo: 2, duration: 25, recipesCompleted: 0 })]);
  const profile = (await get()).profile; assert.equal(profile.bestScore, 800); assert.equal(profile.totalGames, 2); assert.equal(profile.totalScore, 1000);
  mock.db.runTransaction = async () => { throw new Error('权限拒绝'); };
  const before = mock.writes; assert.equal((await get()).ok, false); assert.equal(mock.writes, before);
});

test('远程配置不存在时返回本地默认信号，只返回白名单参数', async () => {
  const mock = cloudMock(), get = mock.load('getGameConfig'); assert.equal((await get()).config, null);
  mock.docs.set('game_config/current', { gravity: 2300, secret: 'ignored', unrelated: 4 }); assert.deepEqual(JSON.parse(JSON.stringify((await get()).config)), { gravity: 2300 });
});

test('一局云结果只发一次，已销毁游戏忽略迟到的云响应', async () => {
  const api = wxMock(), game = new Game(api, { autoStart: false, raf: () => 0, caf: () => {} });
  let calls = 0, resolveCloud;
  game.cloud = { saveRunResult: () => { calls++; return new Promise(resolve => { resolveCloud = resolve; }); } };
  game.tutorialCompleted = true; game.start(); game.score.award(700); game.runDuration = 20;
  game.finishRun(); game.finishRun(); assert.equal(calls, 1); game.destroy();
  const newer = new Game(api, { autoStart: false, raf: () => 0, caf: () => {} });
  newer.local.save({ bestScore: 1000 }); resolveCloud({ bestScore: 9000 });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(api.storage.get('PanToss.save.v1').bestScore, 1000); newer.destroy();
});

test('云调用保留部署和索引错误，回调与 Promise 双返回只处理一次', async () => {
  const api = wxMock(), cloud = new CloudService(api, 'test-env', 20);
  api.cloud = { init() {}, callFunction(opts) {
    opts.success({ result: { ok: false, code: 'INDEX_REQUIRED' } });
    return Promise.resolve({ result: { ok: true, entries: [] } });
  } };
  await cloud.init(); assert.equal(await cloud.call('getLeaderboard'), null);
  const board = new LeaderboardService(cloud); assert.match(board.errorMessage(), /索引/);
  api.cloud.callFunction = opts => opts.fail({ errMsg: 'FUNCTION_NOT_FOUND: function not found' });
  assert.equal(await board.getEntries('classic'), null); assert.match(board.errorMessage(), /未部署/);
  api.cloud.callFunction = () => Promise.resolve({ result: { ok: true, entries: [], mine: null } });
  assert.equal((await board.getEntries('classic')).entries.length, 0); assert.equal(cloud.errors.has('getLeaderboard'), false);
});

test('请求超时保留错误，迟到回调不会擦掉诊断，初始化并发只调用一次', async () => {
  const api = wxMock(); let ready, late, initCalls = 0;
  api.cloud = { init: () => { initCalls++; return new Promise(resolve => { ready = resolve; }); }, callFunction: opts => { late = opts.success; } };
  const cloud = new CloudService(api, 'test-env', 10);
  const first = cloud.init(), second = cloud.init(); ready(); await Promise.all([first, second]);
  assert.equal(initCalls, 1); assert.equal(await cloud.call('getLeaderboard'), null);
  assert.equal(cloud.errors.get('getLeaderboard').code, 'CLOUD_TIMEOUT');
  late({ result: { ok: true, entries: [] } }); assert.equal(cloud.errors.get('getLeaderboard').code, 'CLOUD_TIMEOUT');
});
