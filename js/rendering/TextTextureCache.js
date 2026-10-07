import ShaderProgram from './ShaderProgram.js';

export default class TextTextureCache {
  constructor(gl, api = wx) {
    this.gl = gl; this.api = api; this.cache = new Map(); this.limit = 128;
    this.canvas = api.createOffscreenCanvas ? api.createOffscreenCanvas({ type: '2d', width: 16, height: 16 }) : api.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw new Error('PanToss 无法创建离屏文字画布');
    this.buffer = gl.createBuffer(); this.vertices = new Float32Array(24);
    this.shader = new ShaderProgram(gl,
      'attribute vec2 a_position; attribute vec2 a_uv; uniform vec2 u_resolution; varying vec2 v_uv; void main(){ vec2 p=a_position/u_resolution*2.0-1.0; gl_Position=vec4(p.x,-p.y,0,1); v_uv=a_uv; }',
      'precision mediump float; varying vec2 v_uv; uniform sampler2D u_texture; uniform float u_alpha; void main(){ gl_FragColor=texture2D(u_texture,v_uv)*vec4(1,1,1,u_alpha); }');
    this.position = this.shader.attribute('a_position'); this.uv = this.shader.attribute('a_uv');
    this.resolution = this.shader.uniform('u_resolution'); this.alpha = this.shader.uniform('u_alpha'); this.texture = this.shader.uniform('u_texture');
  }
  get(text, size, color, bold) {
    const key = [text, size, color, bold].join('|');
    if (this.cache.has(key)) { const value = this.cache.get(key); this.cache.delete(key); this.cache.set(key, value); return value; }
    const ctx = this.ctx, gl = this.gl, density = 2;
    const font = `${bold ? 'bold ' : ''}${size * density}px sans-serif`;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width / density) + 8, h = Math.ceil(size * 1.45) + 8;
    this.canvas.width = w * density; this.canvas.height = h * density;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); ctx.font = font;
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, 4 * density, h * density / 2);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
    const result = { texture, w, h }; this.cache.set(key, result);
    if (this.cache.size > this.limit) { const oldest = this.cache.keys().next().value; gl.deleteTexture(this.cache.get(oldest).texture); this.cache.delete(oldest); }
    return result;
  }
  draw(text, x, y, size = 26, color = '#514236', align = 'left', bold = false, alpha = 1, scale = 1) {
    const item = this.get(String(text), size, color, bold), w = item.w * scale, h = item.h * scale;
    if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
    y -= h / 2;
    const v = this.vertices;
    v.set([x, y, 0, 0, x + w, y, 1, 0, x + w, y + h, 1, 1, x, y, 0, 0, x + w, y + h, 1, 1, x, y + h, 0, 1]);
    const gl = this.gl; this.shader.use();
    gl.uniform2f(this.resolution, this.width, this.height); gl.uniform1f(this.alpha, alpha); gl.uniform1i(this.texture, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, item.texture); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer); gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.position); gl.vertexAttribPointer(this.position, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(this.uv); gl.vertexAttribPointer(this.uv, 2, gl.FLOAT, false, 16, 8); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  number(value, x, y, size = 42, color = '#514236', align = 'left') {
    const digits = String(value), step = size * 0.62;
    if (align === 'center') x -= digits.length * step / 2;
    if (align === 'right') x -= digits.length * step;
    for (let i = 0; i < digits.length; i++) this.draw(digits[i], x + i * step, y, size, color, 'left', true);
  }
  begin(width, height) { this.width = width; this.height = height; }
  destroy() { for (const value of this.cache.values()) this.gl.deleteTexture(value.texture); this.cache.clear(); this.gl.deleteBuffer(this.buffer); this.shader.destroy(); }
}
