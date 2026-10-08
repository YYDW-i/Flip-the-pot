import { button, panel, centeredPanel } from './UIHelpers.js';

export default class NicknamePrompt {
  layout(camera) {
    const p = centeredPanel(camera, 460);
    return { panel: p, confirm: { x: p.x + 65, y: p.y + 285, w: p.w - 130, h: 65 },
      skip: { x: p.x + 65, y: p.y + 375, w: p.w - 130, h: 50 } };
  }
  render(r, game) {
    const l = this.layout(r.camera), p = l.panel, prompt = game.nicknamePrompt;
    panel(r, p);
    r.label('欢迎来到颠个锅', 375, p.y + 57, 36, '#514236', 'center', true);
    r.label('使用微信昵称参与排行榜', 375, p.y + 123, 27, '#514236', 'center');
    r.label('昵称会向其他玩家公开展示', 375, p.y + 165, 23, '#8c785f', 'center');
    r.label('暂不授权也可以匿名游玩和上榜', 375, p.y + 202, 22, '#8c785f', 'center');
    r.label(prompt.message || '请确认微信隐私授权', 375, p.y + 247, 20, '#8c785f', 'center');
    button(r, l.confirm, game.identitySaving ? '正在保存昵称…' : game.local.data.pendingNickname ? '重试保存昵称' : game.userInfo.phase === 'privacy' ? '等待隐私确认' : '同意并继续');
    button(r, l.skip, '暂不授权，继续游玩', false);
  }
}
