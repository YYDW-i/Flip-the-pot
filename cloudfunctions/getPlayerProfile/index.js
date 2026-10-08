const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { normalize, readPlayer, publicProfile } = require('./player');
exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { ok: false, code: 'UNAUTHENTICATED' };
  try {
    const profile = await db.runTransaction(async transaction => {
      const ref = transaction.collection('players').doc(openid);
      const previous = await readPlayer(ref);
      const player = normalize(previous || { openid, createdAt: db.serverDate(), updatedAt: db.serverDate(), lastPlayedAt: null, recentRunIds: [] });
      // 老档案访问时迁移到经典榜，已存在的无尽统计不被覆盖。
      if (!previous || !previous.modes || previous.classicPlayed === undefined) {
        await ref.set({ data: player });
      }
      return publicProfile(player);
    });
    return { ok: true, profile };
  } catch (e) { console.error('getPlayerProfile 数据库操作失败', e.message); return { ok: false, code: 'DATABASE_UNAVAILABLE' }; }
};
