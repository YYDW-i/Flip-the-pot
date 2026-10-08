import { modeId } from '../config/modes.js';
export default class LeaderboardService {
  constructor(cloud) { this.cloud = cloud; }
  errorMessage() {
    const error = this.cloud.errors && (this.cloud.errors.get('getLeaderboard') || this.cloud.errors.get('init'));
    const messages = {
      ENV_NOT_CONFIGURED: '排行榜服务尚未配置', CLOUD_UNSUPPORTED: '当前微信版本不支持云排行榜',
      FUNCTION_NOT_FOUND: '排行榜服务尚未部署', COLLECTION_NOT_FOUND: '排行榜数据集合尚未创建',
      INDEX_REQUIRED: '排行榜索引尚未就绪', CLOUD_TIMEOUT: '连接超时，请稍后刷新',
      UNAUTHENTICATED: '微信登录未完成，请重新进入', DATABASE_UNAVAILABLE: '排行榜数据读取失败，请稍后刷新'
    };
    return messages[error && error.code] || '连接失败，请稍后刷新';
  }
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
