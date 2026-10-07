import { button, panel, centeredPanel } from './UIHelpers.js';

export default class MenuScreen {
  layout(camera) {
    const y = camera.safeTop + (camera.height - camera.safeTop - camera.safeBottom) * 0.66;
    return { start: { x: 150, y, w: 450, h: 98 }, help: { x: 150, y: y + 128, w: 205, h: 64 }, settings: { x: 395, y: y + 128, w: 205, h: 64 } };
  }
  settingsLayout(camera) {
    const p = centeredPanel(camera, 435);
    return { panel: p, sound: { x: p.x + 55, y: p.y + 108, w: p.w - 110, h: 66 }, haptic: { x: p.x + 55, y: p.y + 193, w: p.w - 110, h: 66 }, close: { x: p.x + 100, y: p.y + 305, w: p.w - 200, h: 75 } };
  }
  render(r, game) {
    const h = r.camera.height, top = r.camera.safeTop, layout = this.layout(r.camera);
    r.label('颠个锅', 375, top + h * 0.16, 76, '#443b32', 'center', true);
    r.label('颠起来，接住你的下一次连锁', 375, top + h * 0.225, 27, '#8c785f', 'center');
    r.drawMenuHero(game, h * 0.47);
    r.label('最高分', 375, layout.start.y - 75, 23, '#8c785f', 'center');
    r.number(game.bestScore, 375, layout.start.y - 38, 38, '#514236', 'center');
    button(r, layout.start, '开始颠锅'); button(r, layout.help, '玩法', false); button(r, layout.settings, '设置', false);
    r.label('一根手指，颠出一锅好戏', 375, h - r.camera.safeBottom - 36, 23, '#fff5e7', 'center');
    if (!game.settingsOpen) return;
    const s = this.settingsLayout(r.camera); panel(r, s.panel);
    r.label('设置', 375, s.panel.y + 56, 37, '#514236', 'center', true);
    button(r, s.sound, '音效：' + (game.audio.enabled ? '开' : '关'), false);
    button(r, s.haptic, '震动：' + (game.haptics.enabled ? '开' : '关'), false);
    r.label('本版音效接口已预留', 375, s.panel.y + 282, 20, '#9c8d78', 'center');
    button(r, s.close, '完成');
  }
}
