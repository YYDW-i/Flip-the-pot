import { modeId } from '../config/modes.js';
export default class LeaderboardService {
  constructor(cloud) { this.cloud = cloud; }
  async getEntries(mode, page = 0) {
    if (!this.cloud.available && !await this.cloud.init()) return null;
    const id = modeId(mode), result = await this.cloud.call('getLeaderboard', { mode: id, page });
    if (!result || !Array.isArray(result.entries)) return null;
    const validScore = value => Number.isSafeInteger(value) && value >= 0 && value <= 10000000;
    const validRank = value => Number.isSafeInteger(value) && value > 0;
    const name = value => Array.from(typeof value === 'string' ? value : '匿名小厨').slice(0, 20).join('');
    const mine = result.mine && typeof result.mine === 'object' ? result.mine : {};
    return { mode: id, page, hasNext: result.hasNext === true, entries: result.entries.slice(0, 10)
      .filter(row => row && validScore(row.score) && validRank(row.rank))
      .map(row => ({ score: row.score, rank: row.rank, nickname: name(row.nickname), isMe: row.isMe === true })),
      mine: { score: validScore(mine.score) ? mine.score : 0, rank: validRank(mine.rank) ? mine.rank : null, nickname: name(mine.nickname) } };
  }
  async updateIdentity(nickname) {
    if (!this.cloud.available && !await this.cloud.init()) return null;
    const result = await this.cloud.call('updatePlayerIdentity', { consent: true, nickname });
    return result && result.profile;
  }
}
