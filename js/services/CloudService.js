import { CLOUD_ENV_ID, CLOUD_TIMEOUT_MS } from '../config/env.js';

export default class CloudService {
  constructor(api = wx, envId = CLOUD_ENV_ID, timeoutMs = CLOUD_TIMEOUT_MS) {
    this.api = api; this.envId = envId; this.timeoutMs = timeoutMs; this.available = false; this.errors = new Map();
  }
  failure(name, error, fallback = 'CLOUD_UNAVAILABLE') {
    const detail = error && (error.errMsg || error.message) || '';
    let code = error && error.code || fallback;
    if (/FUNCTION_NOT_FOUND|FUNCTION_NOT_EXIST|function.*(?:not found|not exist)|云函数.*不存在/i.test(detail)) code = 'FUNCTION_NOT_FOUND';
    else if (/collection.*(?:not exist|not found)|集合.*不存在/i.test(detail)) code = 'COLLECTION_NOT_FOUND';
    else if (/index|索引/i.test(detail)) code = 'INDEX_REQUIRED';
    this.errors.set(name, { code, detail });
    console.warn('PanToss 云调用失败：' + name, code, detail);
    return null;
  }
  async init() {
    if (this.available) return true;
    if (this.initializing) return this.initializing;
    this.initializing = this.initialize();
    try { return await this.initializing; } finally { this.initializing = null; }
  }
  async initialize() {
    if (!this.envId || this.envId === 'YOUR_CLOUD_ENV_ID' || !this.api.cloud) {
      this.failure('init', null, this.api.cloud ? 'ENV_NOT_CONFIGURED' : 'CLOUD_UNSUPPORTED'); return false;
    }
    let timer;
    try {
      await Promise.race([
        Promise.resolve(this.api.cloud.init({ env: this.envId, traceUser: true })),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('初始化超时')), this.timeoutMs); })
      ]);
      this.available = true;
      this.errors.delete('init');
    }
    catch (e) { this.failure('init', e); }
    finally { clearTimeout(timer); }
    return this.available;
  }
  call(name, data = {}) {
    if (!this.available) { this.failure(name, this.errors.get('init')); return Promise.resolve(null); }
    return new Promise(resolve => {
      let settled = false;
      const finish = value => { if (settled) return; settled = true; clearTimeout(timer); resolve(value); };
      const fail = (error, fallback) => { if (!settled) finish(this.failure(name, error, fallback)); };
      const success = response => {
        if (settled) return;
        if (response && response.result && response.result.ok) { this.errors.delete(name); finish(response.result); }
        else fail(response && response.result, 'INVALID_RESPONSE');
      };
      const timer = setTimeout(() => fail(null, 'CLOUD_TIMEOUT'), this.timeoutMs);
      try {
        const result = this.api.cloud.callFunction({ name, data, config: { env: this.envId }, success, fail });
        // 同时兼容基础库回调和 Promise，完成守卫保证只处理一次。
        if (result && typeof result.then === 'function') result.then(success, fail);
      } catch (e) { fail(e); }
    });
  }
  async bootstrap() {
    if (!await this.init()) return { profile: null, config: null };
    const [profile, config] = await Promise.all([this.call('getPlayerProfile'), this.call('getGameConfig')]);
    return { profile: profile && profile.profile, config: config && config.config };
  }
  async saveRunResult(result) {
    if (!this.available && !await this.init()) return null;
    const response = await this.call('saveRunResult', result); return response && response.profile;
  }
}
