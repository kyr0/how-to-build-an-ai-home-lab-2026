const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_uv;

const float PI = 3.14159265358979323846;

// Network layout
const int LAYERS = 4;
const int NODES_PER_LAYER = 7;

float hash11(float p) {
  return fract(sin(p * 127.1) * 43758.5453123);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float lineDistance(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h);
}

vec2 nodePosition(float layer, float index) {
  float layers = float(LAYERS);
  float perLayer = float(NODES_PER_LAYER);

  // Base grid position (columns = layers, rows = nodes)
  float x = mix(0.15, 0.85, layer / (layers - 1.0));
  float baseY = (index + 0.5) / perLayer;

  // Static jitter to break uniformity
  float j = hash21(vec2(layer, index)) - 0.5;
  float y = baseY + j * 0.22;

  // Faster drift / wobble
  float t = u_time * 1.0;
  float phase = hash21(vec2(layer * 13.0, index * 17.0)) * PI * 2.0;
  y += sin(t + phase) * 0.03;
  x += cos(t * 2.0 + phase) * 0.03;

  // Keep nodes on screen
  y = clamp(y, 0.04, 0.96);
  x = clamp(x, 0.08, 0.92);

  return vec2(x, y);
}

void accumulateEdge(inout float glow, vec2 uv, vec2 a, vec2 b, float thickness) {
  float d = lineDistance(uv, a, b);
  float g1 = smoothstep(thickness * 2.5, 0.0, d);
  float g2 = smoothstep(thickness * 1.0, 0.0, d);
  glow += g1 * 0.4 + g2 * 0.6;
}

void main() {
  // Aspect-corrected UV
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 uv = (v_uv - 0.5) * aspect + 0.5;

  // Background gradient (faster)
  float t = u_time * 0.2;
  float g = uv.y + 0.15 * sin(t + uv.x * 4.0);
  vec3 bgA = vec3(0.01, 0.02, 0.06);
  vec3 bgB = vec3(0.03, 0.06, 0.12);
  vec3 base = mix(bgA, bgB, clamp(g, 0.0, 1.0));

  float nodeCore = 0.0;
  float nodeHalo = 0.0;
  float edges = 0.0;

  // Nodes
  for (int l = 0; l < LAYERS; ++l) {
    for (int i = 0; i < NODES_PER_LAYER; ++i) {
      vec2 p = nodePosition(float(l), float(i));
      float d = length(uv - p);

      nodeCore += smoothstep(0.018, 0.0, d);
      nodeHalo += smoothstep(0.06, 0.0, d);
    }
  }

  // Edges between neighboring layers
  const float thickness = 0.0045;
  for (int l = 0; l < LAYERS - 1; ++l) {
    for (int i = 0; i < NODES_PER_LAYER; ++i) {
      vec2 a = nodePosition(float(l), float(i));

      // Connect each node to a few pseudo-random nodes in the next layer
      for (int k = 0; k < 3; ++k) {
        float seed = float(l * 23 + i * 7 + k * 11);
        float r = hash11(seed);
        float j = floor(r * float(NODES_PER_LAYER));
        vec2 b = nodePosition(float(l + 1), j);
        accumulateEdge(edges, uv, a, b, thickness);
      }
    }
  }

  // Colors
  vec3 linkColor = vec3(0.16, 0.75, 0.96);
  vec3 nodeColor = vec3(0.90, 0.96, 1.00);
  vec3 haloColor = vec3(0.30, 0.20, 0.60);

  vec3 color = base;

  // Edges and halos (more visible)
  color += linkColor * edges * 1.2;
  color += haloColor * nodeHalo * 0.5;

  // Pulsing node cores (faster)
  float pulse = 0.6 + 0.4 * sin(u_time * 4.0);
  color += nodeColor * nodeCore * pulse;

  // Subtle scanline / activity band (faster)
  float band = smoothstep(0.0, 0.4, sin(uv.y * 18.0 + u_time * 2.0));
  color += linkColor * band * 0.05 * edges;

  // Vignette
  vec2 centered = (uv - 0.5) * aspect;
  float vignette = smoothstep(0.9, 0.35, length(centered));
  color *= vignette;

  gl_FragColor = vec4(color, 1.0);
}
`;


function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export default class ShaderBackground {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    container.appendChild(this.canvas);

    const gl = this.canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      container.classList.add("shader-fallback");
      return;
    }

    this.gl = gl;
    this.start = performance.now();
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);

    if (!this.setupProgram()) {
      container.classList.add("shader-fallback");
      return;
    }

    window.addEventListener("resize", this.resize, { passive: true });
    this.resize();
    this.frameId = requestAnimationFrame(this.render);
  }

  setupProgram() {
    const gl = this.gl;
    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);

    if (!program) {
      return false;
    }

    this.program = program;
    gl.useProgram(program);

    this.uniforms = {
      time: gl.getUniformLocation(program, "u_time"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
    };

    this.attributes = {
      position: gl.getAttribLocation(program, "a_position"),
    };

    const vertices = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]);

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.attributes.position);
    gl.vertexAttribPointer(this.attributes.position, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return true;
  }

  resize() {
    if (!this.gl) {
      return;
    }

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const ratio = this.pixelRatio;

    if (!width || !height) {
      return;
    }

    const displayWidth = Math.floor(width * ratio);
    const displayHeight = Math.floor(height * ratio);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }

    this.gl.viewport(0, 0, displayWidth, displayHeight);
  }

  render(now) {
    if (!this.gl) {
      return;
    }

    const gl = this.gl;
    const elapsed = (now - this.start) / 1000;

    gl.useProgram(this.program);
    gl.uniform1f(this.uniforms.time, elapsed);
    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.frameId = requestAnimationFrame(this.render);
  }

  destroy() {
    if (!this.gl) {
      return;
    }

    cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.resize);
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteProgram(this.program);
    this.gl = null;
  }
}


