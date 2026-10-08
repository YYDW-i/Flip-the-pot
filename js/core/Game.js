import config from '../config/gameConfig.js';
import Camera from '../rendering/Camera.js';
import RendererGL from '../rendering/RendererGL.js';
import Pot from '../entities/Pot.js';
import PhysicsWorld from '../physics/PhysicsWorld.js';
import GameLoop from './GameLoop.js';
import InputManager from '../input/InputManager.js';
import ScoreSystem from '../systems/ScoreSystem.js';
import MergeSystem from '../systems/MergeSystem.js';
import ComboSystem from '../systems/ComboSystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import ParticleSystem from '../systems/ParticleSystem.js';
import HapticManager from '../services/HapticManager.js';
import AudioManager from '../services/AudioManager.js';
import LocalSaveService from '../services/LocalSaveService.js';
import CloudService from '../services/CloudService.js';
import { validateRemoteConfig } from '../config/remoteConfig.js';
import Random from '../utils/Random.js';
import State from './GameState.js';
import Ingredient from '../entities/Ingredient.js';
import SpawnSystem from '../systems/SpawnSystem.js';
import RecipeSystem from '../systems/RecipeSystem.js';
import HUD from '../ui/HUD.js';
import MenuScreen from '../ui/MenuScreen.js';
import TutorialOverlay from '../ui/TutorialOverlay.js';
import GameOverScreen from '../ui/GameOverScreen.js';
import { inside } from '../utils/MathUtils.js';
import { CLASSIC, ENDLESS, modeId } from '../config/modes.js';
import LeaderboardService from '../services/LeaderboardService.js';
import UserInfoService from '../services/UserInfoService.js';
import LeaderboardScreen from '../ui/LeaderboardScreen.js';
import NicknamePrompt from '../ui/NicknamePrompt.js';

export default class Game {
  constructor(api = wx, options = {}) {
    this.api = api; this.config = Object.assign({}, config); this.disposed = false;
    this.state = State.BOOT; this.visualTime = 0; this.runCounter = 0; this.seed = options.seed === undefined ? Date.now() >>> 0 : options.seed;
    this.local = new LocalSaveService(api);
    this.userInfo = new UserInfoService(api); this.nickname = ''; this.boardToken = 0; this.leaderboardOpen = false;
    this.leaderboardScreen = new LeaderboardScreen();
    this.nicknamePromptScreen = new NicknamePrompt(); this.nicknamePrompt = { open: false, message: '' }; this.hidden = false;
    this.mode = this.local.data.selectedMode;
    this.bestScore = this.local.best(this.mode); this.tutorialCompleted = this.local.data.tutorialCompleted; this.settingsOpen = false;
    this.canvas = api.createCanvas();
    this.camera = new Camera(this.canvas, this.config, api);
    this.renderer = new RendererGL(this.canvas, this.camera, this.config, api);
    this.pot = new Pot(this.config, this.camera.width, this.camera.height, this.camera.safeBottom);
    this.world = new PhysicsWorld(this.config, this.pot);
    this.score = new ScoreSystem(this.config);
    this.hud = new HUD(); this.menu = new MenuScreen(); this.tutorial = new TutorialOverlay(this.config); this.gameOver = new GameOverScreen();
    this.menuIngredients = this.config.TYPES.map((type, i) => new Ingredient(-i - 1, type.id, 2, 0, 0, this.config));
    this.spawner = new SpawnSystem(this.config, this.world, this.camera);
    this.combo = new ComboSystem(this.config); this.slowTime = 0; this.lastSlowTime = -10;
    this.particles = new ParticleSystem(this.config, new Random(711));
    this.haptics = new HapticManager(this.config, api); this.audio = new AudioManager(api);
    this.audio.enabled = this.local.data.soundEnabled; this.haptics.enabled = this.local.data.hapticEnabled;
    this.saveSystem = new SaveSystem(this.config, this.pot, this.score);
    this.merge = new MergeSystem(this.world, this.score, this.config, this.combo);
    this.recipe = new RecipeSystem(this.world, this.score, this.combo, this.config);
    this.recipe.onRecipe = (recipe, x, y, points, air) => this.recipeFeedback(recipe, x, y, points, air);
    this.merge.onMerge = (body, points, air) => this.mergeFeedback(body, points, air);
    this.saveSystem.onSave = (body, points) => { this.particles.text('救回来了！ +' + points, body.position.x, body.position.y - 65, '#3e8561'); this.haptics.light(); };
    this.world.onPair = (a, b) => !this.endingTime && (this.recipe.collide(a, b) || this.merge.collide(a, b));
    this.world.onPanContact = (body, impact, index) => {
      if (this.endingTime) return;
      this.saveSystem.land(body, index, this.world.time);
      if (this.state === State.TUTORIAL) this.tutorial.land(body, index, this.world.time);
    };
    this.world.onLand = (body, impact) => {
      this.audio.playLand(); if (impact > 400) this.particles.shake(2, 0.08);
    };
    this.world.onCollision = (a, b) => this.particles.burst((a.position.x + b.position.x) / 2, (a.position.y + b.position.y) / 2, [1, 0.85, 0.57, 1], 3, 90);
    this.input = new InputManager(this.camera, this.config, {
      dragStart: p => this.dragStart(p), dragMove: (p, data) => this.dragMove(p, data), tap: p => this.tap(p)
    }, api);
    this.loop = new GameLoop(this.config, dt => this.update(dt), dt => { this.visualTime += dt; this.renderer.render(this); }, options.raf, options.caf);
    this.loop.onFatal = error => {
      try { if (api.showModal) api.showModal({ title: '运行异常', content: '游戏已停止，请重新进入。详情见开发者工具控制台：' + error.message, showCancel: false }); } catch (e) {}
    };
    this.onHide = () => { this.hidden = true; this.userInfo.clear(); this.pause(); this.input.cancel(); this.audio.stop(); this.loop.stop(); };
    this.onShow = () => { this.hidden = false; this.input.cancel(); this.resumeNicknamePrompt(); this.loop.start(); };
    this.onResize = () => this.resize();
    if (api.onHide) api.onHide(this.onHide);
    if (api.onShow) api.onShow(this.onShow);
    if (api.onWindowResize) api.onWindowResize(this.onResize);
    this.resetRun(); this.setState(State.MENU);
    this.cloud = new CloudService(api);
    this.leaderboard = new LeaderboardService(this.cloud);
    this.bootstrapPromise = this.cloud.bootstrap().then(data => {
      if (this.disposed) return;
      this.local.mergeProfile(data.profile); this.bestScore = this.local.best(this.mode);
      if (data.profile && data.profile.nickname && !this.local.data.pendingNickname && !this.identitySaving) {
        this.nickname = data.profile.nickname; this.dismissNicknamePrompt();
      }
      if (this.local.data.pendingNickname) this.syncNickname();
      // 远程参数只在下一局重置时应用，不能改变正在进行的物理局面。
      this.pendingConfig = validateRemoteConfig(data.config, this.config);
    }).catch(() => { console.warn('PanToss 云启动检查失败，继续本地游戏'); });
    this.promptNickname();
    if (options.autoStart !== false) this.loop.start();
  }
  setState(state) {
    if (state !== State.MENU) { this.closeLeaderboard(); this.dismissNicknamePrompt(false); }
    this.state = state; if (this.input) this.input.cancel();
  }
  closeLeaderboard() { this.leaderboardOpen = false; this.boardToken++; }
  async loadLeaderboard(mode = this.mode, page = 0) {
    this.leaderboardOpen = true; const token = ++this.boardToken;
    this.board = { mode: modeId(mode), page, entries: [], hasNext: false, mine: null, phase: 'loading', errorMessage: '' };
    try {
      // 刚结算便打开榜单时，先等成绩写入，避免读到上一刻的空榜。
      if (this.runSyncPromise) await this.runSyncPromise;
      if (this.disposed || token !== this.boardToken) return;
      const result = await this.leaderboard.getEntries(this.board.mode, page);
      if (this.disposed || token !== this.boardToken) return;
      if (result && Array.isArray(result.entries)) Object.assign(this.board, result, { phase: 'ready' });
      else Object.assign(this.board, { phase: 'offline', errorMessage: this.leaderboard.errorMessage() });
    } catch (e) { if (!this.disposed && token === this.boardToken) Object.assign(this.board, { phase: 'offline', errorMessage: this.leaderboard.errorMessage() }); }
  }
  promptNickname(force = false) {
    if (this.disposed || this.hidden || this.state !== State.MENU) return;
    if (!force && (this.local.data.nicknamePromptHandled || this.nickname || !this.api.createUserInfoButton)) return;
    this.nicknamePrompt.open = true; this.settingsOpen = false; this.resumeNicknamePrompt();
  }
  resumeNicknamePrompt() {
    if (!this.nicknamePrompt.open || this.hidden || this.identitySaving || this.userInfo.phase !== 'idle') return;
    if (this.local.data.pendingNickname) { this.nicknamePrompt.message = '已确认昵称，联网后可重试保存'; return; }
    this.userInfo.prepare(this.nicknamePromptScreen.layout(this.camera).confirm, this.camera,
      message => { this.nicknamePrompt.message = message; },
      nickname => {
        this.local.save({ nicknamePromptHandled: true, pendingNickname: nickname });
        this.syncNickname();
      }, () => this.dismissNicknamePrompt());
  }
  dismissNicknamePrompt(handled = true) {
    if (handled) this.local.save({ nicknamePromptHandled: true });
    this.nicknamePrompt.open = false; this.userInfo.clear();
  }
  async syncNickname() {
    if (this.identitySaving || !this.local.data.pendingNickname || this.disposed) return;
    this.identitySaving = true; this.nicknamePrompt.message = '正在保存公开昵称…';
    try {
      const profile = await this.leaderboard.updateIdentity(this.local.data.pendingNickname);
      if (this.disposed) return;
      if (profile && profile.nickname) {
        this.nickname = profile.nickname; this.local.mergeProfile(profile); this.local.save({ pendingNickname: '' });
        this.bestScore = this.local.best(this.mode); this.dismissNicknamePrompt();
        if (this.leaderboardOpen) await this.loadLeaderboard(this.board.mode, this.board.page);
      } else this.nicknamePrompt.message = '昵称保存失败，请重试或先匿名游玩';
    } catch (e) { if (!this.disposed) this.nicknamePrompt.message = '昵称保存失败，请重试或先匿名游玩'; }
    finally { this.identitySaving = false; }
  }
  tapLeaderboard(point) {
    const l = this.leaderboardScreen.layout(this.camera), b = this.board;
    if (inside(point, l.close)) this.closeLeaderboard();
    else if (inside(point, l.classic)) this.loadLeaderboard(CLASSIC);
    else if (inside(point, l.endless)) this.loadLeaderboard(ENDLESS);
    else if (b.phase !== 'loading') {
      if (inside(point, l.previous) && b.page > 0) this.loadLeaderboard(b.mode, b.page - 1);
      else if (inside(point, l.next) && b.hasNext) this.loadLeaderboard(b.mode, b.page + 1);
      else if (inside(point, l.refresh)) this.loadLeaderboard(b.mode, b.page);
    }
  }
  active() { return (this.state === State.PLAYING || this.state === State.TUTORIAL) && !this.endingTime; }
  resetRun() {
    if (this.pendingConfig) { Object.assign(this.config, this.pendingConfig); this.pendingConfig = null; }
    this.world.reset(); this.score.reset(this.mode === ENDLESS ? this.config.ENDLESS_START_SCORE : 0); this.combo.reset(); this.particles.reset();
    this.recipe.reset();
    this.pot = new Pot(this.config, this.camera.width, this.camera.height, this.camera.safeBottom);
    this.world.pot = this.pot; this.saveSystem.pot = this.pot;
    if (this.mode === CLASSIC) this.lostCount = 0; else delete this.lostCount;
    this.runDuration = 0; this.endingTime = 0; this.result = null;
    this.runId = Date.now().toString(36) + '-' + this.seed.toString(36) + '-' + this.runCounter;
    this.slowTime = 0; this.lastSlowTime = -10; this.settingsOpen = false;
    this.spawner.reset((this.seed + this.runCounter++) >>> 0); this.tutorial.reset();
    this.seedIngredients();
    if (this.loop) this.loop.resetClock();
  }
  seedIngredients() {
    const initial = this.config.INITIAL_INGREDIENTS;
    initial.forEach((type, i) => this.world.add(type, 1, this.pot.positionX + (i - (initial.length - 1) / 2) * this.config.INITIAL_SPACING, this.pot.positionY - 8));
  }
  start(forceTutorial = false) { this.audio.prepare(); this.resetRun(); this.setState(forceTutorial || !this.tutorialCompleted ? State.TUTORIAL : State.PLAYING); }
  selectMode(value) {
    if (this.state !== State.MENU) return;
    this.mode = modeId(value); this.local.save({ selectedMode: this.mode }); this.bestScore = this.local.best(this.mode);
    this.resetRun();
  }
  completeTutorial() { this.tutorialCompleted = true; this.local.save({ tutorialCompleted: true }); this.start(); }
  pause() { if (this.state === State.PLAYING || this.state === State.TUTORIAL) { this.pauseReturn = this.state; this.setState(State.PAUSED); } }
  resume() { if (this.state === State.PAUSED) { this.loop.resetClock(); this.setState(this.pauseReturn || State.PLAYING); } }
  returnHome() { this.audio.stop(); this.resetRun(); this.setState(State.MENU); }
  dragStart(point) {
    if (!this.active() || point.y < this.camera.height * 0.4) return false;
    this.dragOffset = this.pot.targetX - point.x;
    return true;
  }
  dragMove(point, data) {
    if (!this.active()) return;
    this.pot.setTarget(point.x + this.dragOffset, data.velocityX);
    if (data.toss) this.toss(data.toss);
  }
  tap(point) {
    if (this.nicknamePrompt.open) {
      const l = this.nicknamePromptScreen.layout(this.camera);
      if (inside(point, l.skip)) this.dismissNicknamePrompt();
      else if (inside(point, l.confirm) && this.local.data.pendingNickname) this.syncNickname();
      return;
    }
    if (this.state === State.MENU) {
      if (this.leaderboardOpen) { this.tapLeaderboard(point); return; }
      if (this.settingsOpen) {
        const s = this.menu.settingsLayout(this.camera);
        if (inside(point, s.sound)) this.audio.setEnabled(!this.audio.enabled);
        else if (inside(point, s.haptic)) { this.haptics.enabled = !this.haptics.enabled; this.haptics.light(); }
        else if (inside(point, s.nickname)) this.promptNickname(true);
        else if (inside(point, s.close)) this.settingsOpen = false;
        this.local.save({ soundEnabled: this.audio.enabled, hapticEnabled: this.haptics.enabled });
        return;
      }
      const l = this.menu.layout(this.camera);
      if (inside(point, l.classic)) this.selectMode(CLASSIC);
      else if (inside(point, l.endless)) this.selectMode(ENDLESS);
      else if (inside(point, l.start)) this.start();
      else if (inside(point, l.help)) this.start(true);
      else if (inside(point, l.settings)) this.settingsOpen = true;
      else if (inside(point, l.leaderboard)) this.loadLeaderboard();
    } else if (this.state === State.PAUSED) {
      const l = this.gameOver.pauseLayout(this.camera);
      if (inside(point, l.resume)) this.resume();
      else if (inside(point, l.restart)) this.start();
      else if (inside(point, l.menu)) this.returnHome();
    } else if (this.state === State.GAME_OVER) {
      const l = this.gameOver.layout(this.camera);
      if (inside(point, l.restart)) this.start(); else if (inside(point, l.menu)) this.returnHome();
    } else if (this.active()) {
      if (inside(point, this.hud.pauseRect(this.camera))) this.pause();
      else if (this.state === State.TUTORIAL && inside(point, this.tutorial.skipRect(this.camera))) this.completeTutorial();
    }
  }
  toss(gesture) {
    if (!this.active()) return 0;
    const count = this.pot.toss(this.world.bodies, gesture, this.world.time);
    if (count) { this.audio.playToss(); this.haptics.light(); if (this.state === State.TUTORIAL) this.tutorial.toss(this.pot); }
    return count;
  }
  mergeFeedback(body, points, air) {
    const p = body.position, color = this.config.TYPES.find(type => type.id === body.type).color;
    this.particles.burst(p.x, p.y, color, air ? 28 + Math.min(30, this.combo.count * 4) : 14, air ? 370 : 230);
    this.particles.ring(p.x, p.y, body.radius, air ? [1, 0.75, 0.2, 1] : color);
    this.particles.text((air ? '空中合成！ +' : '+') + points, p.x, p.y - body.radius - 30, air ? '#d65a2a' : '#6b5944', air ? 34 : 27);
    if (air) { this.audio.playAirMerge(); this.haptics.light(); this.particles.shake(3); } else this.audio.playMerge();
    if (body.level >= 4) this.particles.shake(3);
    if (this.combo.airStreak >= 2) this.particles.text('完美颠锅！', this.camera.width / 2, this.camera.hudTop + 180, '#d65a2a', 38);
    if (this.combo.count >= 4 && this.world.time - this.lastSlowTime > this.config.SLOWMO_COOLDOWN) { this.slowTime = this.config.SLOWMO_DURATION; this.lastSlowTime = this.world.time; }
  }
  recipeFeedback(recipe, x, y, points, air) {
    this.particles.dish(recipe, x, y); this.particles.burst(x, y, [1, 0.75, 0.3, 1], air ? 65 : 40, 360);
    this.particles.ring(x, y, 65, [1, 0.72, 0.22, 1]); this.particles.shake(4, 0.15);
    this.particles.text((air ? '空中料理！' : recipe.name + '出锅！') + ' +' + points, x, y - 85, '#c5562f', 32);
    this.audio.playRecipe(); this.haptics.light();
  }
  update(dt) {
    if (this.state !== State.PLAYING && this.state !== State.TUTORIAL) return;
    if (this.endingTime > 0) {
      this.endingTime = Math.max(0, this.endingTime - dt);
      this.world.step(dt * Math.max(0.05, this.endingTime / this.config.GAME_OVER_SLOW_DURATION) * 0.4);
      this.particles.update(dt);
      if (!this.endingTime) this.finishRun();
      return;
    }
    this.runDuration += dt;
    this.slowTime = Math.max(0, this.slowTime - dt);
    this.saveSystem.update(this.world.bodies, this.world.time);
    this.world.step(dt * (this.slowTime > 0 ? this.config.SLOWMO_SCALE : 1), dt);
    this.combo.update(this.world.time, dt); this.particles.update(dt);
    if (this.state === State.PLAYING) this.spawner.update(dt);
    else {
      this.tutorial.move(this.pot);
      if (this.tutorial.step === 3 && this.world.time - this.tutorial.completeTime > 1.5) { this.completeTutorial(); return; }
    }
    this.checkLost();
  }
  checkLost() {
    for (const body of this.world.bodies) {
      if (!body.alive) continue;
      const p = body.position, c = this.config;
      const lost = p.y - body.radius > this.pot.baseY + c.LOST_DEPTH || p.x + body.radius < -c.LOST_SIDE_MARGIN || p.x - body.radius > this.camera.width + c.LOST_SIDE_MARGIN;
      if (!lost) continue;
      body.alive = false;
      if (this.state === State.TUTORIAL) continue;
      let message = '掉了一份！';
      if (this.mode === ENDLESS) message = '掉落 Lv' + body.level + ' −' + this.score.lose(body.level);
      else this.lostCount++;
      this.audio.playLose(); this.haptics.light(); this.particles.shake(4, 0.16);
      this.particles.text(message, Math.max(150, Math.min(this.camera.width - 150, p.x)), this.pot.baseY + 90, '#b54b36', 30);
      const ended = this.mode === ENDLESS ? this.score.score < 0 : this.lostCount >= c.MISS_LIMIT;
      if (ended) { this.endingTime = c.GAME_OVER_SLOW_DURATION; this.input.cancel(); break; }
    }
    this.world.compact();
    if (this.state === State.TUTORIAL && this.tutorial.step < 3 && this.world.bodies.length < 3) {
      const time = this.world.time; this.world.reset(); this.world.time = time; this.seedIngredients();
    }
  }
  finishRun() {
    if (this.result) return;
    this.result = { runId: this.runId, mode: this.mode, score: this.score.peak, finalScore: this.score.score, maxCombo: this.combo.maxCombo, duration: Math.max(0.01, this.runDuration), recipesCompleted: this.score.recipesCompleted };
    this.local.recordRun(this.result); this.bestScore = this.local.best(this.mode);
    this.audio.playGameOver(); this.setState(State.GAME_OVER);
    // 一局只提交一次；网络失败保留本地结果，不阻塞再开一局。
    this.runSyncState = 'saving';
    this.runSyncPromise = this.cloud.saveRunResult(this.result).then(profile => {
      if (!this.disposed) {
        this.local.mergeProfile(profile); this.bestScore = this.local.best(this.mode); this.runSyncState = profile ? 'ready' : 'failed';
      }
    }).catch(() => { if (!this.disposed) this.runSyncState = 'failed'; });
  }
  resize() {
    this.userInfo.clear();
    this.pause(); this.input.cancel(); const oldY = this.pot.baseY;
    this.camera.resize(); this.pot.resize(this.camera.height, this.camera.safeBottom); this.pot.updateSegments();
    const dy = this.pot.baseY - oldY;
    for (const body of this.world.bodies) { body.position.y += dy; body.previousY += dy; }
    this.loop.resetClock();
    this.resumeNicknamePrompt();
  }
  destroy() {
    this.disposed = true;
    this.closeLeaderboard(); this.userInfo.destroy();
    this.loop.stop(); this.input.destroy(); this.renderer.destroy(); this.audio.destroy();
    if (this.api.offHide) this.api.offHide(this.onHide);
    if (this.api.offShow) this.api.offShow(this.onShow);
    if (this.api.offWindowResize) this.api.offWindowResize(this.onResize);
  }
}
