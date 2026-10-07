export default class ShaderProgram {
  constructor(gl, vertex, fragment) {
    this.gl = gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('PanToss 着色器编译失败：' + gl.getShaderInfoLog(shader));
      return shader;
    };
    const v = compile(gl.VERTEX_SHADER, vertex), f = compile(gl.FRAGMENT_SHADER, fragment);
    this.program = gl.createProgram(); gl.attachShader(this.program, v); gl.attachShader(this.program, f); gl.linkProgram(this.program);
    gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error('PanToss 着色器链接失败：' + gl.getProgramInfoLog(this.program));
  }
  use() { this.gl.useProgram(this.program); }
  uniform(name) { return this.gl.getUniformLocation(this.program, name); }
  attribute(name) { return this.gl.getAttribLocation(this.program, name); }
  destroy() { this.gl.deleteProgram(this.program); }
}
