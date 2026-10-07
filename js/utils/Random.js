export default class Random {
  constructor(seed = Date.now()) { this.state = seed >>> 0; }
  next() {
    // Mulberry32：所有玩法随机都可被种子重现。
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min, max) { return min + (max - min) * this.next(); }
  int(max) { return Math.floor(this.next() * max); }
}
