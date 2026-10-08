import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AudioManager from '../js/services/AudioManager.js';
import { AUDIO_SOURCES } from '../js/config/audioConfig.js';
import Game from '../js/core/Game.js';
import { wxMock } from './helpers/wxMock.mjs';

function audioApi() {
  const api = wxMock(), contexts = [];
  api.setInnerAudioOption = options => { api.audioOptions = options; };
  api.createInnerAudioContext = options => {
    const context = { options, plays: 0, stops: 0, destroyed: false,
      onError(handler) { this.errorHandler = handler; }, play() { this.plays++; },
      stop() { this.stops++; }, destroy() { this.destroyed = true; } };
    contexts.push(context); return context;
  };
  return { api, contexts };
}

test('七类本地音效是有效的非静音 WAV，全部包含在小游戏包内', () => {
  const ignores = JSON.parse(fs.readFileSync('project.config.json', 'utf8')).packOptions.ignore;
  assert.equal(Object.keys(AUDIO_SOURCES).length, 7);
  for (const source of Object.values(AUDIO_SOURCES)) {
    assert.equal(ignores.some(item => source === item.value || source.startsWith(item.value + '/')), false, source);
    const wav = fs.readFileSync(source);
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt16LE(20), 1); assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt32LE(24), 44100); assert.equal(wav.readUInt16LE(34), 16);
    assert.equal(wav.readUInt32LE(40), wav.length - 44);
    let energy = 0, peak = 0;
    for (let i = 44; i < wav.length; i += 2) { const v = wav.readInt16LE(i); energy += v * v; peak = Math.max(peak, Math.abs(v)); }
    assert.ok(Math.sqrt(energy / ((wav.length - 44) / 2)) > 2000, source + ' 有效音量');
    assert.ok(peak < 32767); assert.ok(wav.length / 88200 < 0.8);
  }
});

test('原生音频走扬声器并忽略静音开关，限频复用，关闭与销毁释放播放', () => {
  const { api, contexts } = audioApi(); let time = 1000;
  const audio = new AudioManager(api, AUDIO_SOURCES, () => time); audio.prepare();
  assert.equal(contexts.length, 7); assert.equal(api.audioOptions.obeyMuteSwitch, false); assert.equal(api.audioOptions.speakerOn, true);
  for (const context of contexts) { assert.equal(context.options.useWebAudioImplement, false); assert.equal(context.obeyMuteSwitch, false); }
  assert.equal(audio.play('land'), true); assert.equal(audio.play('land'), false);
  time += 120; assert.equal(audio.play('land'), true); assert.equal(contexts.length, 7);
  audio.setEnabled(false); assert.equal(audio.play('recipe'), false);
  assert.ok(contexts.every(context => context.stops > 0));
  audio.setEnabled(true); assert.equal(audio.contexts.get('merge').plays, 1);
  audio.destroy(); assert.ok(contexts.every(context => context.destroyed)); assert.equal(audio.contexts.size, 0);
});

test('游戏设置打开声音立即试听、保存开关，后台和回首页停止声音', () => {
  const { api, contexts } = audioApi(), game = new Game(api, { autoStart: false, raf: () => 0, caf: () => {} });
  game.settingsOpen = true;
  const rect = game.menu.settingsLayout(game.camera).sound, point = { x: rect.x + 10, y: rect.y + 10 };
  game.tap(point); assert.equal(game.audio.enabled, false);
  game.tap(point); assert.equal(game.audio.enabled, true); assert.equal(contexts[0].plays, 1);
  assert.equal(api.storage.get('PanToss.save.v1').soundEnabled, true);
  game.tutorialCompleted = true; game.start(); game.audio.playRecipe();
  const stops = contexts.map(c => c.stops); api.emit('Hide');
  assert.ok(contexts.every((c, i) => c.stops > stops[i]));
  game.returnHome(); game.destroy(); assert.ok(contexts.every(c => c.destroyed));
});
