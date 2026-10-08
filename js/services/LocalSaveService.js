import { CLASSIC, MODE_IDS, modeId } from '../config/modes.js';
const KEY = 'PanToss.save.v1';
const DEFAULTS = {
  tutorialCompleted: false, bestScore: 0, bestCombo: 0, totalGames: 0,
  totalScore: 0, recipesCompleted: 0, soundEnabled: true, hapticEnabled: true, selectedMode: CLASSIC,
  nicknamePromptHandled: false, pendingNickname: ''
};
const STATS = ['bestScore', 'bestCombo', 'totalGames', 'totalScore', 'recipesCompleted'];
const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;

export default class LocalSaveService {
  constructor(api = wx) {
    this.api = api; this.data = Object.assign({}, DEFAULTS); this.data.modes = {};
    for (const id of MODE_IDS) this.data.modes[id] = Object.fromEntries(STATS.map(key => [key, 0]));
    let legacy = false;
    try { const saved = api.getStorageSync(KEY); if (saved && typeof saved === 'object') { legacy = !saved.modes; this.apply(saved); } }
    catch (e) { console.warn('PanToss 本地存档读取失败，使用内存存档'); }
    // 老存档属于经典模式，绝不复制到无尽模式。
    if (legacy) for (const key of STATS) this.data.modes.classic[key] = Math.max(this.data.modes.classic[key], this.data[key]);
  }
  apply(patch) {
    for (const key of Object.keys(DEFAULTS)) {
      if (!(key in patch)) continue;
      if (key === 'selectedMode') { this.data.selectedMode = modeId(patch[key]); continue; }
      if (key === 'pendingNickname') {
        if (typeof patch[key] === 'string') this.data[key] = Array.from(patch[key].replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 20).join('');
        continue;
      }
      if (typeof DEFAULTS[key] === 'boolean') { if (typeof patch[key] === 'boolean') this.data[key] = patch[key]; }
      else this.data[key] = integer(patch[key]);
    }
    if (patch.modes && typeof patch.modes === 'object') {
      for (const id of MODE_IDS) if (patch.modes[id] && typeof patch.modes[id] === 'object') {
        for (const key of STATS) if (key in patch.modes[id]) this.data.modes[id][key] = integer(patch.modes[id][key]);
      }
    }
  }
  save(patch = {}) {
    this.apply(patch);
    try { this.api.setStorageSync(KEY, { ...this.data, modes: Object.fromEntries(MODE_IDS.map(id => [id, { ...this.data.modes[id] }])) }); }
    catch (e) { console.warn('PanToss 本地存档写入失败，本局仍可继续'); }
    return this.data;
  }
  recordRun(result) {
    const id = modeId(result.mode), previous = this.data.modes[id];
    const current = {
      bestScore: Math.max(previous.bestScore, integer(result.score)), bestCombo: Math.max(previous.bestCombo, integer(result.maxCombo)),
      totalGames: previous.totalGames + 1, totalScore: previous.totalScore + integer(result.score),
      recipesCompleted: previous.recipesCompleted + integer(result.recipesCompleted)
    };
    return this.save({
      modes: { [id]: current },
      bestScore: Math.max(this.data.bestScore, integer(result.score)), bestCombo: Math.max(this.data.bestCombo, integer(result.maxCombo)),
      totalGames: this.data.totalGames + 1, totalScore: this.data.totalScore + integer(result.score),
      recipesCompleted: this.data.recipesCompleted + integer(result.recipesCompleted)
    });
  }
  mergeProfile(profile) {
    if (!profile || typeof profile !== 'object') return this.data;
    const patch = {};
    for (const key of STATS) patch[key] = Math.max(this.data[key], integer(profile[key]));
    patch.modes = {};
    for (const id of MODE_IDS) {
      const remote = profile.modes ? profile.modes[id] || {} : id === CLASSIC ? profile : {};
      patch.modes[id] = Object.fromEntries(STATS.map(key => [key, Math.max(this.data.modes[id][key], integer(remote[key]))]));
    }
    return this.save(patch);
  }
  best(mode) { return this.data.modes[modeId(mode)].bestScore; }
}
