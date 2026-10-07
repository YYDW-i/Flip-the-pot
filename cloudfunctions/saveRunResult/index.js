const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const fields = ['bestScore', 'bestCombo', 'totalGames', 'totalScore', 'recipesCompleted'];
const nonnegative = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const publicProfile = player => Object.fromEntries(fields.map(key => [key, nonnegative(player[key])]));

function validRun(event) {
  const bounded = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
  return event && bounded(event.score, 10000000) && bounded(event.maxCombo, 1000) &&
    typeof event.duration === 'number' && Number.isFinite(event.duration) && event.duration > 0 && event.duration <= 86400 &&
    bounded(event.recipesCompleted, 1000) && (event.runId === undefined || (typeof event.runId === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(event.runId)));
}
async function readPlayer(ref) {
  try { const result = await ref.get(); return Array.isArray(result.data) ? result.data[0] : result.data; }
  catch (e) {
    if (e.code === 'DATABASE_DOCUMENT_NOT_EXIST' || /document.*(?:does not exist|not found|不存在)/i.test(e.errMsg || e.message || '')) return null;
    throw e;
  }
}
exports.main = async event => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { ok: false, code: 'UNAUTHENTICATED' };
  if (!validRun(event)) return { ok: false, code: 'INVALID_RUN' };
  // 未来可在这里加入 replay/hash 验证，身份始终来自云调用上下文。
  try {
    const profile = await db.runTransaction(async transaction => {
      const ref = transaction.collection('players').doc(openid), previous = await readPlayer(ref) || {};
      const recent = Array.isArray(previous.recentRunIds) ? previous.recentRunIds.filter(id => typeof id === 'string').slice(-40) : [];
      if (event.runId && recent.includes(event.runId)) return publicProfile(previous);
      if (event.runId) recent.push(event.runId);
      const player = {
        openid, bestScore: Math.max(nonnegative(previous.bestScore), event.score), bestCombo: Math.max(nonnegative(previous.bestCombo), event.maxCombo),
        totalGames: nonnegative(previous.totalGames) + 1, totalScore: nonnegative(previous.totalScore) + event.score,
        recipesCompleted: nonnegative(previous.recipesCompleted) + event.recipesCompleted,
        createdAt: previous.createdAt || db.serverDate(), updatedAt: db.serverDate(), lastPlayedAt: db.serverDate(), recentRunIds: recent.slice(-40)
      };
      await ref.set({ data: player }); return publicProfile(player);
    });
    return { ok: true, profile };
  } catch (e) { console.error('saveRunResult 数据库操作失败', e.message); return { ok: false, code: 'DATABASE_UNAVAILABLE' }; }
};
