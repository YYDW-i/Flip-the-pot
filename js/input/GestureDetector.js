import { clamp } from '../utils/MathUtils.js';

export default class GestureDetector {
  constructor(config) { this.config = config; this.reset(); }
  reset() { this.samples = []; this.locked = false; this.lowestY = 0; }
  start(point, time) { this.reset(); this.samples.push({ x: point.x, y: point.y, time }); this.lowestY = point.y; }
  move(point, time) {
    const c = this.config, samples = this.samples;
    if (samples.length && time <= samples[samples.length - 1].time) time = samples[samples.length - 1].time + 0.001;
    samples.push({ x: point.x, y: point.y, time });
    while (samples.length > 2 && time - samples[0].time > c.GESTURE_WINDOW) samples.shift();
    while (samples.length > 16) samples.shift();
    const first = samples[0], elapsed = Math.max(0.016, time - first.time);
    const velocityX = clamp((point.x - first.x) / elapsed, -c.MAX_TOSS_SPEED, c.MAX_TOSS_SPEED);
    if (this.locked) {
      this.lowestY = Math.min(this.lowestY, point.y);
      if (point.y - this.lowestY > c.GESTURE_REARM_DISTANCE) this.start(point, time);
      return { velocityX, toss: null };
    }
    const distance = first.y - point.y, speed = distance / elapsed;
    const toss = distance >= c.MIN_TOSS_DISTANCE && speed >= c.MIN_TOSS_SPEED ? { speed: clamp(speed, c.MIN_TOSS_SPEED, c.MAX_TOSS_SPEED), velocityX, distance } : null;
    if (toss) { this.locked = true; this.lowestY = point.y; }
    return { velocityX, toss };
  }
}
