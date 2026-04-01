// ── WebGL Smoke Renderer ──────────────────────────────────────────────────────
class SmokeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.animationId = null;
    this.program = null;
    this.vs = null;
    this.fs = null;
    this.buffer = null;
    this.uniforms = {};
    this.color = [1.0, 0.33, 0.0]; // brand orange (#ff5500)

    this.gl = canvas.getContext('webgl2');
    if (!this.gl) { console.error('WebGL2 not supported'); return; }

    this._vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

    this._fragmentSrc = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;
#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)
float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}
void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);
  float n=fbm(uv*.28-vec2(T*.10,0));
  n=noise(uv*3.+n*2.);
  col.r-=fbm(uv+vec2(0,T*.2)+n);
  col.g-=fbm(uv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=fbm(uv*1.006+vec2(0,T*.015)+n+.006);
  col=mix(col,u_color,dot(col,vec3(.21,.71,.07)));
  col=mix(vec3(.08),col,min(time*.6,1.));
  col=clamp(col,.08,1.);
  O=vec4(col,1);
}`;

    this._setup();
    this._init();
  }

  _compile(shader, source) {
    const gl = this.gl;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(shader));
    }
  }

  _setup() {
    const gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER);
    this.fs = gl.createShader(gl.FRAGMENT_SHADER);
    this.program = gl.createProgram();
    this._compile(this.vs, this._vertexSrc);
    this._compile(this.fs, this._fragmentSrc);
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program));
    }
    this.uniforms = {
      resolution: gl.getUniformLocation(this.program, 'resolution'),
      time:       gl.getUniformLocation(this.program, 'time'),
      u_color:    gl.getUniformLocation(this.program, 'u_color'),
    };
  }

  _init() {
    const gl = this.gl;
    const vertices = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  }

  updateScale() {
    const dpr = Math.max(1, window.devicePixelRatio);
    this.canvas.width  = window.innerWidth  * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  updateColor(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (m) this.color = [parseInt(m[1],16)/255, parseInt(m[2],16)/255, parseInt(m[3],16)/255];
  }

  render(now = 0) {
    const { gl, program, buffer, canvas, uniforms } = this;
    if (!gl || !program) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, now * 1e-3);
    gl.uniform3fv(uniforms.u_color, this.color);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  start() {
    this.updateScale();
    this._resizeHandler = () => this.updateScale();
    window.addEventListener('resize', this._resizeHandler);
    const loop = (now) => {
      this.render(now);
      this.animationId = requestAnimationFrame(loop);
    };
    loop(0);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    const { gl, program, vs, fs, buffer } = this;
    if (gl && program) {
      if (vs) { gl.detachShader(program, vs); gl.deleteShader(vs); }
      if (fs) { gl.detachShader(program, fs); gl.deleteShader(fs); }
      gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
    }
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
const smokeRenderer = new SmokeRenderer(document.getElementById('smoke-canvas'));
smokeRenderer.updateColor('#cc0018');
smokeRenderer.start();
