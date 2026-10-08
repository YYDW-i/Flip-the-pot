import { modeId } from '../config/modes.js';
export default class LeaderboardService {
  constructor(cloud) { this.cloud = cloud; }
  async getEntries(mode, page = 0) {
    if (!this.cloud.available && !await this.cloud.init()) return null;
    return this.cloud.call('getLeaderboard', { mode: modeId(mode), page });
  }
  async updateIdentity(nickname) {
    if (!this.cloud.available && !await this.cloud.init()) return null;
    const result = await this.cloud.call('updatePlayerIdentity', { consent: true, nickname });
    return result && result.profile;
  }
}
