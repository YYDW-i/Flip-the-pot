const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { MODES, normalize, readPlayer, publicProfile } = require('./player');

function validRun(event) {
  const bounded = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
  return event && (event.mode === undefined || MODES.includes(event.mode)) && bounded(event.score, 10000000) && bounded(event.maxCombo, 1000) &&
    typeof event.duration === 'number' && Number.isFinite(event.duration) && event.duration > 0 && event.duration <= 86400 &&
    bounded(event.recipesCompleted, 1000) &&
    (event.finalScore === undefined || (Number.isInteger(event.finalScore) && event.finalScore >= (event.mode === 'endless' ? -640 : 0) && event.finalScore <= event.score)) &&
    (event.runId === undefined || (typeof event.runId === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(event.runId)));
}
exports.main = async event => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { ok: false, code: 'UNAUTHENTICATED' };
  if (!validRun(event)) return { ok: false, code: 'INVALID_RUN' };
  // 未来可在这里加入 replay/hash 验证，身份始终来自云调用上下文。
  try {
    const profile = await db.runTransaction(async transaction => {
      const ref = transaction.collection('players').doc(openid), previous = normalize(await readPlayer(ref) || {});
      const mode = event.mode || 'classic', modeStats = previous.modes[mode];
      const recent = Array.isArray(previous.recentRunIds) ? previous.recentRunIds.filter(id => typeof id === 'string').slice(-40) : [];
      if (event.runId && recent.includes(event.runId)) return publicProfile(previous);
      if (event.runId) recent.push(event.runId);
      previous.modes[mode] = { bestScore: Math.max(modeStats.bestScore, event.score), bestCombo: Math.max(modeStats.bestCombo, event.maxCombo),
        totalGames: modeStats.totalGames + 1, totalScore: modeStats.totalScore + event.score, recipesCompleted: modeStats.recipesCompleted + event.recipesCompleted };
      const player = normalize({
        ...previous, openid, bestScore: Math.max(previous.bestScore, event.score), bestCombo: Math.max(previous.bestCombo, event.maxCombo),
        totalGames: previous.totalGames + 1, totalScore: previous.totalScore + event.score,
        recipesCompleted: previous.recipesCompleted + event.recipesCompleted,
        createdAt: previous.createdAt || db.serverDate(), updatedAt: db.serverDate(), lastPlayedAt: db.serverDate(), recentRunIds: recent.slice(-40)
      });
      await ref.set({ data: player }); return publicProfile(player);
    });
    return { ok: true, profile };
  } catch (e) { console.error('saveRunResult 数据库操作失败', e.message); return { ok: false, code: 'DATABASE_UNAVAILABLE' }; }
};
