const FIELDS = ['bestScore', 'bestCombo', 'totalGames', 'totalScore', 'recipesCompleted'];
const MODES = ['classic', 'endless'];
const number = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const stats = source => Object.fromEntries(FIELDS.map(key => [key, number(source && source[key])]));
function normalize(source = {}) {
  const player = { ...source, ...stats(source) };
  // doc.get 会返回数据库主键；doc.set 的 data 禁止包含 _id。
  delete player._id;
  player.modes = Object.fromEntries(MODES.map(mode => [mode, stats(source.modes ? source.modes[mode] : mode === 'classic' ? source : null)]));
  for (const mode of MODES) {
    player[mode + 'BestScore'] = player.modes[mode].bestScore;
    player[mode + 'Played'] = player.modes[mode].totalGames > 0;
  }
  return player;
}
async function readPlayer(ref) {
  try { const result = await ref.get(); return Array.isArray(result.data) ? result.data[0] : result.data; }
  catch (e) {
    if (e.code === 'DATABASE_DOCUMENT_NOT_EXIST' || /document.*(?:does not exist|not found|不存在)/i.test(e.errMsg || e.message || '')) return null;
    throw e;
  }
}
const publicProfile = source => {
  const player = normalize(source);
  return { ...stats(player), modes: player.modes, nickname: typeof player.nickname === 'string' ? player.nickname.slice(0, 20) : '' };
};
module.exports = { FIELDS, MODES, number, stats, normalize, readPlayer, publicProfile };
