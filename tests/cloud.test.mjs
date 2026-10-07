import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import CloudService from '../js/services/CloudService.js';
import { validateRemoteConfig } from '../js/config/remoteConfig.js';
import config from '../js/config/gameConfig.js';
import { wxMock } from './helpers/wxMock.mjs';

function cloudMock() {
  const docs = new Map(); let queue = Promise.resolve(), writes = 0;
  const collection = name => ({ doc: id => ({
    get: async () => ({ data: docs.get(name + '/' + id) }),
    set: async ({ data }) => { docs.set(name + '/' + id, data); writes++; }
  }) });
  const db = { collection, serverDate: () => new Date(), runTransaction: callback => {
    const result = queue.then(() => callback({ collection })); queue = result.catch(() => {}); return result;
  } };
  const cloud = { init() {}, database: () => db, getWXContext: () => ({ OPENID: 'trusted-user' }), DYNAMIC_CURRENT_ENV: 'env' };
  const load = name => { const exports = {}; vm.runInNewContext(fs.readFileSync('cloudfunctions/' + name + '/index.js', 'utf8'), { require: () => cloud, exports, console }); return exports.main; };
  return { docs, db, load, get writes() { return writes; } };
}

test('云环境占位、初始化抛错和请求超时均降级', async () => {
  const api = wxMock(); let calls = 0;
  api.cloud = { init: () => {}, callFunction: () => { calls++; } };
  assert.equal((await new CloudService(api).bootstrap()).profile, null); assert.equal(calls, 0);
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
