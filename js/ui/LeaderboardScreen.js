import { button, panel } from './UIHelpers.js';
import { CLASSIC, ENDLESS } from '../config/modes.js';
const shortName = name => Array.from(name || '匿名小厨').slice(0, 10).join('');
export default class LeaderboardScreen {
  layout(camera) {
    const p = { x: 35, y: camera.hudTop + 5, w: 680, h: camera.height - camera.hudTop - camera.safeBottom - 35 };
    return { panel: p, close: { x: 633, y: p.y + 15, w: 55, h: 50 },
      classic: { x: 95, y: p.y + 90, w: 250, h: 58 }, endless: { x: 405, y: p.y + 90, w: 250, h: 58 },
      previous: { x: 90, y: p.y + p.h - 278, w: 150, h: 52 }, next: { x: 510, y: p.y + p.h - 278, w: 150, h: 52 },
      refresh: { x: 295, y: p.y + p.h - 278, w: 160, h: 52 } };
  }
  render(r, game) {
    const data = game.board, l = this.layout(r.camera), p = l.panel; panel(r, p);
    r.label('最高分排行榜', 375, p.y + 48, 37, '#514236', 'center', true);
    r.label('×', l.close.x + 27, l.close.y + 25, 38, '#8c785f', 'center');
    button(r, l.classic, '经典模式', data.mode === CLASSIC); button(r, l.endless, '无尽模式', data.mode === ENDLESS);
    r.label('全服排行 · 本局最高分 · 同分并列', 375, p.y + 175, 21, '#8c785f', 'center');
    r.label('名次', 95, p.y + 213, 22); r.label('玩家', 210, p.y + 213, 22); r.label('最高分', 650, p.y + 213, 22, '#514236', 'right');
    const rowH = Math.min(55, (p.h - 540) / 10);
    if (data.phase === 'loading') r.label('正在读取排行榜…', 375, p.y + 315, 26, '#8c785f', 'center');
    else if (data.phase === 'offline') {
      r.label('云排行榜暂不可用', 375, p.y + 315, 28, '#b54b36', 'center');
      r.label(data.errorMessage || '连接失败，请稍后刷新', 375, p.y + 360, 22, '#8c785f', 'center');
    } else if (!data.entries.length) r.label('还没有成绩，来颠第一锅吧', 375, p.y + 315, 26, '#8c785f', 'center');
    else data.entries.forEach((entry, i) => {
      const y = p.y + 254 + i * rowH;
      if (entry.isMe) r.batch.roundedRect(66, y - rowH * 0.43, 618, rowH * 0.92, 12, [1, 0.85, 0.62, 0.5]);
      r.number(entry.rank, 105, y, 25, entry.rank <= 3 ? '#df6037' : '#8c785f', 'center');
      r.label(shortName(entry.nickname) + (entry.isMe ? '（我）' : ''), 205, y, 23, '#514236');
      r.number(entry.score, 650, y, 28, '#514236', 'right');
    });
    if (data.page > 0) button(r, l.previous, '上一页', false);
    if (data.hasNext) button(r, l.next, '下一页', false);
    button(r, l.refresh, data.phase === 'loading' ? '读取中' : '刷新', false);
    const mine = data.mine, y = p.y + p.h - 192;
    r.batch.roundedRect(70, y - 26, 610, 63, 16, [0.95, 0.89, 0.77, 0.7]);
    r.label(mine && mine.rank ? '我 · 第 ' + mine.rank + ' 名' : '我 · ' + (data.phase === 'offline' ? '本地最高' : '尚未上榜'), 95, y + 5, 24);
    r.number(mine ? mine.score : game.local.best(data.mode), 650, y + 5, 30, '#df6037', 'right');
    r.label(game.nickname ? '我的昵称：' + shortName(game.nickname) : '我的昵称：匿名小厨', 375, p.y + p.h - 128, 22, '#8c785f', 'center');
    r.label(game.runSyncState === 'failed' ? '本局未同步，请检查网络后再完成一局' : '正式结束一局并成功同步后上榜', 375, p.y + p.h - 90, 21, '#8c785f', 'center');
    r.label('可在首页设置中修改排行昵称', 375, p.y + p.h - 54, 20, '#8c785f', 'center');
  }
}
