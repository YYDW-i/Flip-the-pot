const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { normalize, readPlayer, publicProfile } = require('./player');
exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { ok: false, code: 'UNAUTHENTICATED' };
  if (event.consent !== true || typeof event.nickname !== 'string' || event.nickname.length > 80) return { ok: false, code: 'INVALID_IDENTITY' };
  const nickname = Array.from(event.nickname.replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 20).join('');
  if (!nickname) return { ok: false, code: 'INVALID_IDENTITY' };
  try {
    const profile = await db.runTransaction(async transaction => {
      const ref = transaction.collection('players').doc(openid), previous = await readPlayer(ref);
      const player = normalize(previous || { openid, createdAt: db.serverDate(), recentRunIds: [] });
      player.nickname = nickname; player.identityUpdatedAt = db.serverDate(); player.updatedAt = db.serverDate();
      // 昵称仅用于显示；身份仍来自 OPENID。不保存头像、地区、性别或客户端声明的分数。
      await ref.set({ data: player }); return publicProfile(player);
    });
    return { ok: true, profile };
  } catch (e) { console.error('updatePlayerIdentity 保存失败', e.message); return { ok: false, code: 'DATABASE_UNAVAILABLE' }; }
};
