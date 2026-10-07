import ShaderProgram from './ShaderProgram.js';

const WHITE = [1, 1, 1, 1];
export default class PrimitiveBatch {
  constructor(gl) {
    this.gl = gl; this.count = 0; this.data = new Float32Array(6 * 32766);
    this.buffer = gl.createBuffer(); this.transform();
    this.shader = new ShaderProgram(gl,
      'attribute vec2 a_position; attribute vec4 a_color; uniform vec2 u_resolution; varying vec4 v_color; void main(){ vec2 p=a_position/u_resolution*2.0-1.0; gl_Position=vec4(p.x,-p.y,0,1); v_color=a_color; }',
      'precision mediump float; varying vec4 v_color; void main(){ gl_FragColor=v_color; }');
    this.position = this.shader.attribute('a_position'); this.color = this.shader.attribute('a_color'); this.resolution = this.shader.uniform('u_resolution');
    this.unitCircle = [];
    for (let i = 0; i <= 32; i++) this.unitCircle.push([Math.cos(i * Math.PI / 16), Math.sin(i * Math.PI / 16)]);
  }
  begin(width, height) { this.width = width; this.height = height; this.count = 0; this.root(0, 0); this.transform(); }
  root(x, y) { this.rootX = x; this.rootY = y; }
  transform(x = 0, y = 0, rotation = 0, sx = 1, sy = sx) {
    const c = Math.cos(rotation), s = Math.sin(rotation);
    this.tx = x; this.ty = y; this.a = c * sx; this.b = s * sx; this.c = -s * sy; this.d = c * sy;
  }
  vertex(x, y, color) {
    if ((this.count + 1) * 6 > this.data.length) this.flush();
    const k = this.count++ * 6, data = this.data;
    data[k] = this.rootX + this.tx + x * this.a + y * this.c; data[k + 1] = this.rootY + this.ty + x * this.b + y * this.d;
    data[k + 2] = color[0]; data[k + 3] = color[1]; data[k + 4] = color[2]; data[k + 5] = color[3] === undefined ? 1 : color[3];
  }
  triangle(ax, ay, bx, by, cx, cy, color = WHITE) { this.vertex(ax, ay, color); this.vertex(bx, by, color); this.vertex(cx, cy, color); }
  rect(x, y, w, h, color) { this.triangle(x, y, x + w, y, x + w, y + h, color); this.triangle(x, y, x + w, y + h, x, y + h, color); }
  gradient(x, y, w, h, top, bottom) {
    this.vertex(x, y, top); this.vertex(x + w, y, top); this.vertex(x + w, y + h, bottom);
    this.vertex(x, y, top); this.vertex(x + w, y + h, bottom); this.vertex(x, y + h, bottom);
  }
  ellipse(x, y, rx, ry, color, segments = 32) {
    const stride = segments === 16 ? 2 : 1;
    for (let i = 0; i < 32; i += stride) {
      const a = this.unitCircle[i], b = this.unitCircle[i + stride];
      this.triangle(x, y, x + a[0] * rx, y + a[1] * ry, x + b[0] * rx, y + b[1] * ry, color);
    }
  }
  circle(x, y, radius, color) { this.ellipse(x, y, radius, radius, color); }
  line(ax, ay, bx, by, width, color) {
    const length = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / length * width / 2, ny = (bx - ax) / length * width / 2;
    this.triangle(ax + nx, ay + ny, ax - nx, ay - ny, bx - nx, by - ny, color);
    this.triangle(ax + nx, ay + ny, bx - nx, by - ny, bx + nx, by + ny, color);
  }
  polygon(points, color) { for (let i = 1; i < points.length - 1; i++) this.triangle(points[0][0], points[0][1], points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], color); }
  roundedRect(x, y, w, h, radius, color) {
    this.rect(x + radius, y, w - 2 * radius, h, color); this.rect(x, y + radius, w, h - 2 * radius, color);
    this.circle(x + radius, y + radius, radius, color); this.circle(x + w - radius, y + radius, radius, color);
    this.circle(x + radius, y + h - radius, radius, color); this.circle(x + w - radius, y + h - radius, radius, color);
  }
  flush() {
    if (!this.count) return;
    const gl = this.gl; this.shader.use(); gl.uniform2f(this.resolution, this.width, this.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer); gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, this.count * 6), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.position); gl.vertexAttribPointer(this.position, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(this.color); gl.vertexAttribPointer(this.color, 4, gl.FLOAT, false, 24, 8);
    gl.drawArrays(gl.TRIANGLES, 0, this.count); this.count = 0;
  }
  destroy() { this.shader.destroy(); this.gl.deleteBuffer(this.buffer); }
}
