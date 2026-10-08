import { button, panel, centeredPanel } from './UIHelpers.js';
import { ENDLESS, modeName } from '../config/modes.js';

export default class GameOverScreen {
  layout(camera) {
    const p = centeredPanel(camera, 600);
    return { panel: p, restart: { x: p.x + 65, y: p.y + 405, w: p.w - 130, h: 90 }, menu: { x: p.x + 130, y: p.y + 523, w: p.w - 260, h: 50 } };
  }
  render(r, game) {
    const l = this.layout(r.camera), y = l.panel.y; panel(r, l.panel);
    r.label('这锅翻了', 375, y + 72, 48, '#514236', 'center', true);
    r.label(modeName(game.mode) + (game.mode === ENDLESS ? ' · 本局最高' : ' · 本局得分'), 375, y + 140, 24, '#96836d', 'center');
    r.number(game.score.peak, 375, y + 205, 70, '#df6037', 'center');
    if (game.mode === ENDLESS) r.label('结算分数 ' + game.score.score + ' · 分数低于 0', 375, y + 250, 21, '#b54b36', 'center');
    r.label('最高连击', 255, y + 290, 24, '#96836d', 'center'); r.number(game.combo.maxCombo, 255, y + 336, 36, '#514236', 'center');
    r.label('完成菜品', 495, y + 290, 24, '#96836d', 'center'); r.number(game.score.recipesCompleted, 495, y + 336, 36, '#514236', 'center');
    button(r, l.restart, '再颠一锅'); button(r, l.menu, '回到首页', false);
  }
  pauseLayout(camera) {
    const p = centeredPanel(camera, 410);
    return { panel: p, resume: { x: p.x + 80, y: p.y + 137, w: p.w - 160, h: 85 }, restart: { x: p.x + 100, y: p.y + 265, w: p.w - 200, h: 65 } };
  }
  renderPause(r) {
    const l = this.pauseLayout(r.camera); panel(r, l.panel);
    r.label('先歇一会儿', 375, l.panel.y + 66, 40, '#514236', 'center', true);
    button(r, l.resume, '继续游戏'); button(r, l.restart, '重新来一锅', false);
  }
}
