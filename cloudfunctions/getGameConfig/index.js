const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const allowed = ['gravity', 'spawnInterval', 'minimumSpawnInterval', 'tossPowerMultiplier', 'comboWindow', 'maxIngredientCount'];

exports.main = async () => {
  try {
    const result = await db.collection('game_config').doc('current').get();
    const data = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!data) return { ok: true, config: null };
    const config = {};
    for (const key of allowed) if (key in data) config[key] = data[key];
    return { ok: true, config };
  } catch (e) {
    if (/document.*(?:does not exist|not found|不存在)/i.test(e.errMsg || e.message || '') || e.code === 'DATABASE_DOCUMENT_NOT_EXIST') return { ok: true, config: null };
    console.error('getGameConfig 读取失败', e.message); return { ok: false, code: 'DATABASE_UNAVAILABLE' };
  }
};
