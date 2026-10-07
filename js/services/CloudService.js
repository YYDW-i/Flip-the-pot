import { CLOUD_ENV_ID, CLOUD_TIMEOUT_MS } from '../config/env.js';

export default class CloudService {
  constructor(api = wx, envId = CLOUD_ENV_ID, timeoutMs = CLOUD_TIMEOUT_MS) { this.api = api; this.envId = envId; this.timeoutMs = timeoutMs; this.available = false; }
  async init() {
    if (!this.envId || this.envId === 'YOUR_CLOUD_ENV_ID' || !this.api.cloud) return false;
    let timer;
    try {
      await Promise.race([
        Promise.resolve(this.api.cloud.init({ env: this.envId, traceUser: true })),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('初始化超时')), this.timeoutMs); })
      ]);
      this.available = true;
    }
    catch (e) { console.warn('PanToss 云初始化失败，继续本地游戏'); }
    finally { clearTimeout(timer); }
    return this.available;
  }
  call(name, data = {}) {
    if (!this.available) return Promise.resolve(null);
    return new Promise(resolve => {
      let settled = false;
      const finish = value => { if (settled) return; settled = true; clearTimeout(timer); resolve(value); };
      const success = response => finish(response && response.result && response.result.ok ? response.result : null);
      const timer = setTimeout(() => { console.warn('PanToss 云请求超时：' + name); finish(null); }, this.timeoutMs);
      try {
        const result = this.api.cloud.callFunction({ name, data, config: { env: this.envId }, success, fail: () => finish(null) });
        // 同时兼容基础库回调和 Promise，完成守卫保证只处理一次。
        if (result && typeof result.then === 'function') result.then(success, () => finish(null));
      } catch (e) { finish(null); }
    });
  }
  async bootstrap() {
    if (!await this.init()) return { profile: null, config: null };
    const [profile, config] = await Promise.all([this.call('getPlayerProfile'), this.call('getGameConfig')]);
    return { profile: profile && profile.profile, config: config && config.config };
  }
  async saveRunResult(result) { const response = await this.call('saveRunResult', result); return response && response.profile; }
}
