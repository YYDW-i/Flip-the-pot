import GestureDetector from './GestureDetector.js';

export default class InputManager {
  constructor(camera, config, handlers, api = wx) {
    this.camera = camera; this.handlers = handlers; this.api = api; this.gesture = new GestureDetector(config);
    this.activeId = null; this.dragging = false;
    this.start = this.start.bind(this); this.move = this.move.bind(this); this.end = this.end.bind(this); this.cancel = this.cancel.bind(this);
    api.onTouchStart(this.start); api.onTouchMove(this.move); api.onTouchEnd(this.end); api.onTouchCancel(this.cancel);
  }
  point(touch) { return this.camera.toWorld(touch.clientX === undefined ? touch.x : touch.clientX, touch.clientY === undefined ? touch.y : touch.clientY); }
  time() { return Date.now() / 1000; }
  start(event) {
    if (this.activeId !== null || !event.touches || !event.touches.length) return;
    const touch = event.touches[0]; this.activeId = touch.identifier === undefined ? 0 : touch.identifier;
    const p = this.point(touch); this.startPoint = p; this.moved = false;
    this.dragging = !!this.handlers.dragStart(p); this.gesture.start(p, this.time());
  }
  move(event) {
    if (this.activeId === null) return;
    const touch = (event.touches || []).find(t => (t.identifier === undefined ? 0 : t.identifier) === this.activeId);
    if (!touch) return;
    const p = this.point(touch);
    if (Math.hypot(p.x - this.startPoint.x, p.y - this.startPoint.y) > 14) this.moved = true;
    const data = this.gesture.move(p, this.time());
    if (this.dragging) this.handlers.dragMove(p, data);
  }
  end(event) {
    if (this.activeId === null) return;
    const touch = (event.changedTouches || []).find(t => (t.identifier === undefined ? 0 : t.identifier) === this.activeId);
    if (!touch) return;
    const p = this.point(touch);
    if (Math.hypot(p.x - this.startPoint.x, p.y - this.startPoint.y) > 14) this.moved = true;
    if (this.dragging && this.moved) this.handlers.dragMove(p, this.gesture.move(p, this.time()));
    if (!this.moved) this.handlers.tap(p);
    this.cancel();
  }
  cancel() { this.activeId = null; this.dragging = false; this.gesture.reset(); }
  destroy() {
    for (const [name, callback] of [['Start', this.start], ['Move', this.move], ['End', this.end], ['Cancel', this.cancel]]) {
      if (this.api['offTouch' + name]) this.api['offTouch' + name](callback);
    }
    this.cancel();
  }
}
