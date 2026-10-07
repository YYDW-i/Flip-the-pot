export const ink = '#514236';
export function button(r, rect, text, primary = true) {
  const b = r.batch, { x, y, w, h } = rect;
  b.roundedRect(x, y + 7, w, h, 25, primary ? [0.76, 0.3, 0.16, 0.28] : [0.4, 0.3, 0.2, 0.07]);
  b.roundedRect(x, y, w, h, 25, primary ? [0.96, 0.4, 0.22, 1] : [1, 0.98, 0.91, 1]);
  r.label(text, x + w / 2, y + h / 2, primary ? 34 : 27, primary ? '#ffffff' : ink, 'center', true);
}
export function panel(r, rect) {
  r.batch.rect(0, 0, r.camera.width, r.camera.height, [0.15, 0.16, 0.15, 0.48]);
  r.batch.roundedRect(rect.x, rect.y + 12, rect.w, rect.h, 36, [0.2, 0.14, 0.08, 0.15]);
  r.batch.roundedRect(rect.x, rect.y, rect.w, rect.h, 36, [1, 0.98, 0.92, 1]);
}
export function centeredPanel(camera, h = 500) { return { x: 85, y: (camera.height - h) / 2, w: camera.width - 170, h }; }
