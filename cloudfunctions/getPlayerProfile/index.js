const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const fields = ['bestScore', 'bestCombo', 'totalGames', 'totalScore', 'recipesCompleted'];
const publicProfile = player => Object.fromEntries(fields.map(key => [key, Number.isSafeInteger(player[key]) && player[key] >= 0 ? player[key] : 0]));

async function readPlayer(ref) {
  try { const result = await ref.get(); return Array.isArray(result.data) ? result.data[0] : result.data; }
  catch (e) {
    // 只有明确的文档不存在可以新建；网络和权限故障必须向外抛出。
    if (e.code === 'DATABASE_DOCUMENT_NOT_EXIST' || /document.*(?:does not exist|not found|不存在)/i.test(e.errMsg || e.message || '')) return null;
    throw e;
  }
}
exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { ok: false, code: 'UNAUTHENTICATED' };
  try {
    const profile = await db.runTransaction(async transaction => {
      const ref = transaction.collection('players').doc(openid);
      let player = await readPlayer(ref);
      if (!player) {
        player = { openid, bestScore: 0, bestCombo: 0, totalGames: 0, totalScore: 0, recipesCompleted: 0, createdAt: db.serverDate(), updatedAt: db.serverDate(), lastPlayedAt: null, recentRunIds: [] };
        await ref.set({ data: player });
      }
      return publicProfile(player);
    });
    return { ok: true, profile };
  } catch (e) { console.error('getPlayerProfile 数据库操作失败', e.message); return { ok: false, code: 'DATABASE_UNAVAILABLE' }; }
};
