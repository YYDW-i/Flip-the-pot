export default class TutorialOverlay {
  constructor(config) { this.config = config; this.reset(); }
  reset() { this.step = 0; this.startX = null; this.moveAfterToss = false; this.completeTime = 0; this.tossId = 0; }
  move(pot) {
    if (this.startX === null) this.startX = pot.positionX;
    if (this.step === 0 && Math.abs(pot.positionX - this.startX) > this.config.TUTORIAL_MOVE_DISTANCE) this.step = 1;
    if (this.step === 2 && Math.abs(pot.positionX - this.tossX) > 12) this.moveAfterToss = true;
  }
  toss(pot) { if (this.step === 1 || this.step === 2) { this.step = 2; this.tossId = pot.tossId; this.tossX = pot.positionX; } }
  land(body, index, time) { if (this.step === 2 && body.tossId === this.tossId && this.moveAfterToss && index === 1) { this.step = 3; this.completeTime = time; } }
  skipRect(camera) { return { x: camera.width - 150, y: camera.height - camera.safeBottom - 105, w: 115, h: 54 }; }
  render(r) {
    const messages = ['左右拖动锅，整理食材', '向上快速甩动，颠起食材', '继续移动锅，把食材接回来', '让相同食材在空中碰撞，分数更高'];
    const tips = ['按住屏幕下半部分，往左或右拖', '甩得越快，飞得越高', '再颠一次也可以，多试试接锅', '太好了，准备开始！'];
    const y = r.camera.hudTop + 270;
    r.batch.roundedRect(65, y, 620, 128, 26, [1, 0.99, 0.95, 0.95]);
    r.label(this.step < 3 ? '练习 ' + (this.step + 1) + ' / 3' : '练习完成', 375, y + 27, 20, '#b99057', 'center');
    r.label(messages[this.step], 375, y + 63, this.step < 3 ? 29 : 25, '#514236', 'center', true);
    r.label(tips[this.step], 375, y + 100, 21, '#8c785f', 'center');
    const skip = this.skipRect(r.camera); r.label('跳过练习', skip.x + skip.w / 2, skip.y + skip.h / 2, 22, '#fff7e8', 'center');
  }
}
