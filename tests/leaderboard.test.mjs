import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cloudMock } from './helpers/cloudMock.mjs';
const run = (mode, score, id) => ({ mode, score, runId: id, finalScore: mode === 'endless' ? -10 : score, duration: 15, maxCombo: 2, recipesCompleted: 0 });

test('模式云档案事务更新互不污染，保留昵称并兼容旧经典档案', async () => {
  const mock = cloudMock(), get = mock.load('getPlayerProfile'), save = mock.load('saveRunResult');
  mock.docs.set('players/trusted-user', { bestScore: 700, bestCombo: 3, totalGames: 2, totalScore: 800, nickname: '小厨' });
  const migrated = (await get()).profile; assert.equal(migrated.modes.classic.bestScore, 700); assert.equal(migrated.modes.endless.bestScore, 0);
  await Promise.all([save(run('endless', 1500, 'end1')), save(run('classic', 900, 'classic1'))]);
  assert.equal((await save(run('endless', 1500, 'end1'))).profile.totalGames, 4);
  const profile = (await get()).profile;
  assert.equal(profile.modes.classic.bestScore, 900); assert.equal(profile.modes.endless.bestScore, 1500); assert.equal(profile.nickname, '小厨');
  assert.equal(mock.docs.get('players/trusted-user').endlessPlayed, true);
  for (const patch of [{ mode: 'hacked' }, { finalScore: -9999 }, { finalScore: Infinity }]) assert.equal((await save({ ...run('endless', 200, 'bad'), ...patch })).ok, false);
});

test('全服榜按模式排序、跨页同分并列，回传本人名次且不暴露 OPENID', async () => {
  const mock = cloudMock(), save = mock.load('saveRunResult'), get = mock.load('getLeaderboard');
  for (let i = 0; i < 14; i++) {
    mock.context.OPENID = 'user-' + String(i).padStart(2, '0');
    await save(run('classic', i < 2 ? 900 : i < 12 ? 800 : 700, 'r' + i));
    if (i === 13) await save(run('endless', 1200, 'e13'));
  }
  mock.context.OPENID = 'user-13';
  const first = await get({ mode: 'classic' }), next = await get({ mode: 'classic', page: 1 });
  assert.equal(first.entries[0].rank, 1); assert.equal(first.entries[1].rank, 1); assert.equal(first.entries[2].rank, 3); assert.equal(first.hasNext, true);
  assert.equal(next.entries[0].rank, 3); assert.equal(next.entries[2].rank, 13); assert.equal(next.mine.rank, 13);
  assert.equal(next.entries.find(row => row.isMe).score, 700); assert.equal(JSON.stringify(next).includes('user-13'), false);
  const endless = await get({ mode: 'endless' }); assert.equal(endless.entries.length, 1); assert.equal(endless.mine.score, 1200); assert.equal(endless.mine.rank, 1);
  for (const query of [{ mode: 'bad' }, { mode: 'classic', page: -1 }, { mode: 'classic', page: 100 }, { mode: 'classic', page: 0.5 }]) assert.equal((await get(query)).ok, false);
  mock.context.OPENID = ''; assert.equal((await get({ mode: 'classic' })).code, 'UNAUTHENTICATED');
});

test('公开昵称仅允许明确同意的显示字段，并发更新不丢失成绩', async () => {
  const mock = cloudMock(), identity = mock.load('updatePlayerIdentity'), save = mock.load('saveRunResult');
  assert.equal((await identity({ nickname: '厨师' })).ok, false);
  await Promise.all([identity({ consent: true, nickname: '厨师\u0000小王', openid: 'forged', avatarUrl: 'secret', bestScore: 999999 }), save(run('endless', 700, 'end'))]);
  const player = mock.docs.get('players/trusted-user'); assert.equal(player.nickname, '厨师小王'); assert.equal(player.endlessBestScore, 700);
  assert.equal(player.avatarUrl, undefined); assert.equal(mock.docs.has('players/forged'), false);
  assert.equal((await identity({ consent: true, nickname: ' ' })).ok, false);
  mock.db.runTransaction = async () => { throw new Error('不可用'); };
  assert.equal((await identity({ consent: true, nickname: '小厨' })).ok, false);
});

test('四份可单独部署的云档案 schema 完全一致', () => {
  const source = fs.readFileSync('cloudfunctions/getPlayerProfile/player.js', 'utf8');
  for (const name of ['saveRunResult', 'getLeaderboard', 'updatePlayerIdentity']) assert.equal(fs.readFileSync('cloudfunctions/' + name + '/player.js', 'utf8'), source);
});
