const KEY = 'PanToss.save.v1';
const DEFAULTS = {
  tutorialCompleted: false, bestScore: 0, bestCombo: 0, totalGames: 0,
  totalScore: 0, recipesCompleted: 0, soundEnabled: true, hapticEnabled: true
};
const STATS = ['bestScore', 'bestCombo', 'totalGames', 'totalScore', 'recipesCompleted'];
const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;

export default class LocalSaveService {
  constructor(api = wx) {
    this.api = api; this.data = Object.assign({}, DEFAULTS);
    try { const saved = api.getStorageSync(KEY); if (saved && typeof saved === 'object') this.apply(saved); }
    catch (e) { console.warn('PanToss 本地存档读取失败，使用内存存档'); }
  }
  apply(patch) {
    for (const key of Object.keys(DEFAULTS)) {
      if (!(key in patch)) continue;
      if (typeof DEFAULTS[key] === 'boolean') { if (typeof patch[key] === 'boolean') this.data[key] = patch[key]; }
      else this.data[key] = integer(patch[key]);
    }
  }
  save(patch = {}) {
    this.apply(patch);
    try { this.api.setStorageSync(KEY, Object.assign({}, this.data)); }
    catch (e) { console.warn('PanToss 本地存档写入失败，本局仍可继续'); }
    return this.data;
  }
  recordRun(result) {
    return this.save({
      bestScore: Math.max(this.data.bestScore, integer(result.score)), bestCombo: Math.max(this.data.bestCombo, integer(result.maxCombo)),
      totalGames: this.data.totalGames + 1, totalScore: this.data.totalScore + integer(result.score),
      recipesCompleted: this.data.recipesCompleted + integer(result.recipesCompleted)
    });
  }
  mergeProfile(profile) {
    if (!profile || typeof profile !== 'object') return this.data;
    const patch = {};
    for (const key of STATS) patch[key] = Math.max(this.data[key], integer(profile[key]));
    return this.save(patch);
  }
}
