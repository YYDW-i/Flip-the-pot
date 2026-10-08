// 原创音效生成器：44.1 kHz / 单声道 / 16-bit PCM WAV，固定随机种子可复现。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rate = 44100, tau = Math.PI * 2;
let seed = 1741;
const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
const envelope = (t, length) => t < 0 || t > length ? 0 : Math.min(1, t / 0.008) * Math.pow(1 - t / length, 1.8);
const note = (t, start, length, frequency, gain = 1) => {
  const u = t - start;
  return envelope(u, length) * gain * (Math.sin(tau * frequency * u) + 0.16 * Math.sin(tau * frequency * 2 * u));
};
const sequence = (t, notes, interval, length) => notes.reduce((sum, frequency, i) => sum + note(t, i * interval, length, frequency, 0.6), 0);
const sounds = [
  ['toss', 0.22, t => envelope(t, 0.22) * (0.55 * noise() + 0.5 * Math.sin(tau * (320 * t + 1400 * t * t)))],
  ['land', 0.16, t => envelope(t, 0.16) * (Math.sin(tau * (190 * t - 340 * t * t)) + 0.18 * Math.sin(tau * 760 * t) + 0.08 * noise())],
  ['merge', 0.3, t => sequence(t, [523.25, 783.99], 0.08, 0.2)],
  ['air-merge', 0.42, t => sequence(t, [659.25, 880, 1318.51], 0.08, 0.25)],
  ['lose', 0.34, t => envelope(t, 0.34) * Math.sin(tau * (480 * t - 480 * t * t))],
  ['recipe', 0.65, t => sequence(t, [523.25, 659.25, 783.99, 1046.5], 0.1, 0.32)],
  ['game-over', 0.7, t => sequence(t, [392, 329.63, 261.63], 0.17, 0.34)]
];
const output = path.join(root, 'assets', 'audio'); fs.mkdirSync(output, { recursive: true });
for (const [name, duration, synth] of sounds) {
  const length = Math.ceil(rate * duration), samples = new Float32Array(length); let peak = 0;
  for (let i = 0; i < length; i++) { samples[i] = synth(i / rate); peak = Math.max(peak, Math.abs(samples[i])); }
  const wav = Buffer.alloc(44 + length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) wav.writeInt16LE(Math.round(samples[i] / peak * 0.78 * 32767), 44 + i * 2);
  fs.writeFileSync(path.join(output, name + '.wav'), wav);
}
console.log('已生成 7 段原创本地音效');
