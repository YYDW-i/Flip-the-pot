const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { MODES, normalize, readPlayer } = require('./player');
const name = player => typeof player.nickname === 'string' && player.nickname.trim() ? player.nickname.slice(0, 20) : '匿名小厨';
exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { ok: false, code: 'UNAUTHENTICATED' };
  const mode = event.mode, page = event.page === undefined ? 0 : event.page;
  if (!MODES.includes(mode) || !Number.isInteger(page) || page < 0 || page > 99) return { ok: false, code: 'INVALID_QUERY' };
  const scoreField = mode + 'BestScore', playedField = mode + 'Played', players = db.collection('players');
  const countHigher = score => players.where({ [playedField]: true, [scoreField]: db.command.gt(score) }).count();
  try {
    const [result, own] = await Promise.all([
      players.where({ [playedField]: true }).orderBy(scoreField, 'desc').orderBy('_id', 'asc').skip(page * 10).limit(11)
        .field({ _id: true, nickname: true, [scoreField]: true }).get(),
      readPlayer(players.doc(openid))
    ]);
    const rows = result.data || [], visible = rows.slice(0, 10), mine = own && normalize(own);
    const [firstHigher, mineHigher] = await Promise.all([
      visible.length ? countHigher(visible[0][scoreField]) : { total: 0 },
      mine && mine.modes[mode].totalGames > 0 ? countHigher(mine.modes[mode].bestScore) : { total: 0 }
    ]);
    let rank = firstHigher.total + 1, previousScore;
    const entries = visible.map((player, i) => {
      if (i && player[scoreField] !== previousScore) rank = page * 10 + i + 1;
      previousScore = player[scoreField];
      // 只回传显示字段和是否本人，不把 OPENID 或档案统计暴露给其他玩家。
      return { rank, nickname: name(player), score: player[scoreField], isMe: player._id === openid };
    });
    return { ok: true, mode, page, hasNext: page < 99 && rows.length > 10, entries,
      mine: { nickname: name(mine || {}), score: mine ? mine.modes[mode].bestScore : 0,
        rank: mine && mine.modes[mode].totalGames > 0 ? mineHigher.total + 1 : null } };
  } catch (e) {
    const detail = e.errMsg || e.message || String(e);
    console.error('getLeaderboard 查询失败', detail);
    const code = /index|索引/i.test(detail) ? 'INDEX_REQUIRED' : /collection.*(?:not exist|not found)|集合.*不存在/i.test(detail) ? 'COLLECTION_NOT_FOUND' : 'DATABASE_UNAVAILABLE';
    return { ok: false, code };
  }
};
