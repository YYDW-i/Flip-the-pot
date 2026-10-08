import { ENDLESS, modeName } from '../config/modes.js';
export default class HUD {
  pauseRect(camera) { return { x: camera.width - 100, y: camera.hudTop + 4, w: 64, h: 64 }; }
  render(r, game) {
    const b = r.batch, top = r.camera.hudTop;
    b.roundedRect(28, top, r.camera.width - 56, 88, 24, [1, 0.99, 0.95, 0.94]);
    r.label('分数', 48, top + 26, 21, '#8b7b66'); r.number(game.score.score, 46, top + 61, 38);
    r.label('最高连击', 240, top + 26, 21, '#8b7b66'); r.number(game.combo.maxCombo, 271, top + 61, 34);
    if (game.mode === ENDLESS) {
      r.label('本局最高', 430, top + 26, 21, '#8b7b66'); r.number(game.score.peak, 430, top + 61, 30);
    } else {
      r.label('机会', 445, top + 26, 21, '#8b7b66');
      for (let i = 0; i < game.config.MISS_LIMIT; i++) b.circle(459 + i * 37, top + 60, 11, i < game.config.MISS_LIMIT - game.lostCount ? [0.95, 0.42, 0.27, 1] : [0.85, 0.81, 0.74, 1]);
    }
    const pause = this.pauseRect(r.camera);
    b.roundedRect(pause.x, pause.y, pause.w, pause.h, 18, [0.96, 0.92, 0.84, 1]);
    b.roundedRect(pause.x + 20, pause.y + 18, 7, 28, 3, [0.43, 0.37, 0.3, 1]);
    b.roundedRect(pause.x + 37, pause.y + 18, 7, 28, 3, [0.43, 0.37, 0.3, 1]);
    const next = game.config.TYPES.find(type => type.id === game.spawner.nextType);
    r.label('订单  ' + game.recipe.current.name, 35, top + 125, 25, '#6f7250', 'left', true);
    const requirements = game.recipe.current.ingredients.map(need => game.config.TYPES.find(t => t.id === need.type).name + ' Lv' + need.level).join(' + ');
    r.label(requirements, 35, top + 160, 22, '#8b7b66');
    r.label(modeName(game.mode), r.camera.width - 42, top + 164, 20, '#9c8d78', 'right');
    r.label('下一份：' + next.name, r.camera.width - 42, top + 128, 24, '#80725e', 'right');
    if (game.combo.count > 1) r.label(game.combo.count + ' 连击', r.camera.width / 2, top + 215, 36, '#d95632', 'center', true, 1, 1 + game.combo.pulse);
  }
}
