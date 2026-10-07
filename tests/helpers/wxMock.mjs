export function wxMock() {
  const listeners = new Map(), storage = new Map();
  let resourceId = 0;
  const gl = new Proxy({
    getShaderParameter: () => true, getProgramParameter: () => true,
    getAttribLocation: (_, name) => name === 'a_position' ? 0 : 1,
    getUniformLocation: () => ({}),
    createShader: () => ++resourceId, createProgram: () => ++resourceId,
    createBuffer: () => ++resourceId, createTexture: () => ++resourceId
  }, { get: (target, key) => key in target ? target[key] : /^[A-Z0-9_]+$/.test(key) ? 1 : () => {} });
  const ctx = { measureText: text => ({ width: String(text).length * 28 }), clearRect() {}, fillText() {} };
  const createCanvas = () => ({ width: 375, height: 667, getContext: type => type === '2d' ? ctx : gl });
  const api = {
    createCanvas, createOffscreenCanvas: createCanvas,
    getWindowInfo: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 3, safeArea: { top: 20, bottom: 647 } }),
    getStorageSync: key => storage.get(key), setStorageSync: (key, data) => storage.set(key, data),
    vibrateShort() {}, listeners, storage, gl,
    emit: (event, data) => { for (const fn of listeners.get(event) || []) fn(data); }
  };
  for (const event of ['TouchStart', 'TouchMove', 'TouchEnd', 'TouchCancel', 'Hide', 'Show', 'WindowResize']) {
    api['on' + event] = fn => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); };
    api['off' + event] = fn => listeners.get(event)?.delete(fn);
  }
  return api;
}
