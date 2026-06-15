import { useEffect, useRef } from 'react'
import { useTheme } from '../../context/ThemeContext'

// [r, g, b] in 0-1 range — bg1, bg2, lineColor per theme+mode
// dark mode: bg1=fondo profundo, bg2=segundo tono (distinto al 1), line=acento vibrante
const THEME_COLORS = {
  'matcha':      { bg1: [0.03, 0.10, 0.06], bg2: [0.04, 0.26, 0.35], line: [0.32, 0.72, 0.53] },
  'cafe-oscuro': { bg1: [0.07, 0.04, 0.00], bg2: [0.36, 0.20, 0.04], line: [0.91, 0.72, 0.48] },
  'medianoche':  { bg1: [0.03, 0.03, 0.08], bg2: [0.06, 0.34, 0.40], line: [0.72, 0.63, 1.00] },
  'terracota':   { bg1: [0.07, 0.02, 0.00], bg2: [0.35, 0.22, 0.04], line: [1.00, 0.69, 0.40] },
  'pizarra':     { bg1: [0.01, 0.02, 0.06], bg2: [0.10, 0.16, 0.05], line: [0.66, 0.91, 0.21] },
  'vinyl-dark':  { bg1: [0.04, 0.03, 0.01], bg2: [0.22, 0.16, 0.06], line: [0.91, 0.72, 0.26] },
  'vinyl-light': { bg1: [0.92, 0.88, 0.82], bg2: [0.96, 0.92, 0.85], line: [0.72, 0.26, 0.09] },
}

// light mode: fondos claros con líneas saturadas
const LIGHT_OVERRIDES = {
  'matcha':      { bg1: [0.86, 0.98, 0.92], bg2: [0.86, 0.96, 0.99], line: [0.10, 0.52, 0.38] },
  'cafe-oscuro': { bg1: [0.99, 0.94, 0.86], bg2: [0.99, 0.98, 0.88], line: [0.55, 0.37, 0.14] },
  'medianoche':  { bg1: [0.90, 0.88, 0.99], bg2: [0.88, 0.96, 0.99], line: [0.38, 0.26, 0.82] },
  'terracota':   { bg1: [0.99, 0.92, 0.86], bg2: [0.99, 0.97, 0.88], line: [0.72, 0.35, 0.08] },
  'pizarra':     { bg1: [0.90, 0.96, 0.86], bg2: [0.88, 0.94, 0.99], line: [0.30, 0.58, 0.06] },
  'vinyl-dark':  { bg1: [0.96, 0.92, 0.86], bg2: [0.98, 0.95, 0.89], line: [0.50, 0.34, 0.08] },
  'vinyl-light': { bg1: [0.92, 0.88, 0.82], bg2: [0.96, 0.92, 0.85], line: [0.72, 0.26, 0.09] },
}

const vsSource = `
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
`

const buildFsSource = () => `
  precision highp float;
  uniform vec2  iResolution;
  uniform float iTime;
  uniform vec3  iColor1;
  uniform vec3  iColor2;
  uniform vec3  iLineColor;

  const float overallSpeed      = 0.2;
  const float gridSmoothWidth   = 0.015;
  const float axisWidth         = 0.05;
  const float majorLineWidth    = 0.025;
  const float minorLineWidth    = 0.0125;
  const float majorLineFreq     = 5.0;
  const float minorLineFreq     = 1.0;
  const float scale             = 5.0;
  const float minLineWidth      = 0.01;
  const float maxLineWidth      = 0.2;
  const float lineSpeed         = 1.0 * overallSpeed;
  const float lineAmplitude     = 1.0;
  const float lineFrequency     = 0.2;
  const float warpSpeed         = 0.2 * overallSpeed;
  const float warpFrequency     = 0.5;
  const float warpAmplitude     = 1.0;
  const float offsetFrequency   = 0.5;
  const float offsetSpeed       = 1.33 * overallSpeed;
  const float minOffsetSpread   = 0.6;
  const float maxOffsetSpread   = 2.0;
  const int   linesPerGroup     = 16;

  #define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
  #define drawSmoothLine(pos, hw, t) smoothstep(hw, 0.0, abs(pos - (t)))
  #define drawCrispLine(pos, hw, t) smoothstep(hw + gridSmoothWidth, hw, abs(pos - (t)))
  #define drawPeriodicLine(freq, w, t) drawCrispLine(freq / 2.0, w, abs(mod(t, freq) - (freq) / 2.0))

  float random(float t) {
    return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
  }

  float getPlasmaY(float x, float hFade, float offset) {
    return random(x * lineFrequency + iTime * lineSpeed) * hFade * lineAmplitude + offset;
  }

  void main() {
    vec2 uv    = gl_FragCoord.xy / iResolution.xy;
    vec2 space = (gl_FragCoord.xy - iResolution.xy / 2.0) / iResolution.x * 2.0 * scale;

    float hFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
    float vFade = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

    space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + hFade);
    space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * hFade;

    vec4 lineColor4 = vec4(iLineColor, 1.0);
    vec4 lines      = vec4(0.0);

    for (int l = 0; l < linesPerGroup; l++) {
      float nli      = float(l) / float(linesPerGroup);
      float offTime  = iTime * offsetSpeed;
      float offPos   = float(l) + space.x * offsetFrequency;
      float rand     = random(offPos + offTime) * 0.5 + 0.5;
      float hw       = mix(minLineWidth, maxLineWidth, rand * hFade) / 2.0;
      float offset   = random(offPos + offTime * (1.0 + nli)) * mix(minOffsetSpread, maxOffsetSpread, hFade);
      float linePos  = getPlasmaY(space.x, hFade, offset);
      float line     = drawSmoothLine(linePos, hw, space.y) / 2.0
                     + drawCrispLine(linePos, hw * 0.15, space.y);

      float cx       = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
      vec2  cp       = vec2(cx, getPlasmaY(cx, hFade, offset));
      float circle   = drawCircle(cp, 0.01, space) * 4.0;

      lines += (line + circle) * lineColor4 * rand;
    }

    vec4 fragColor = mix(vec4(iColor1, 1.0), vec4(iColor2, 1.0), uv.x);
    fragColor     *= vFade;
    fragColor.a    = 1.0;
    fragColor     += lines;

    gl_FragColor   = fragColor;
  }
`

function loadShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function initShaderProgram(gl, vs, fs) {
  const vertShader = loadShader(gl, gl.VERTEX_SHADER, vs)
  const fragShader = loadShader(gl, gl.FRAGMENT_SHADER, fs)
  const prog = gl.createProgram()
  gl.attachShader(prog, vertShader)
  gl.attachShader(prog, fragShader)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  return prog
}

export default function ShaderBackground() {
  const canvasRef = useRef(null)
  const { tema, darkMode } = useTheme()

  // ref so render loop reads latest without re-init
  const colorsRef = useRef(null)

  useEffect(() => {
    const palette = darkMode ? THEME_COLORS : LIGHT_OVERRIDES
    colorsRef.current = palette[tema] || THEME_COLORS['matcha']
  }, [tema, darkMode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl')
    if (!gl) return

    const fsSource = buildFsSource()
    const prog = initShaderProgram(gl, vsSource, fsSource)
    if (!prog) return

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)

    const locs = {
      pos:        gl.getAttribLocation(prog, 'aVertexPosition'),
      resolution: gl.getUniformLocation(prog, 'iResolution'),
      time:       gl.getUniformLocation(prog, 'iTime'),
      color1:     gl.getUniformLocation(prog, 'iColor1'),
      color2:     gl.getUniformLocation(prog, 'iColor2'),
      lineColor:  gl.getUniformLocation(prog, 'iLineColor'),
    }

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    window.addEventListener('resize', resize)
    resize()

    // init colorsRef immediately
    const palette = darkMode ? THEME_COLORS : LIGHT_OVERRIDES
    colorsRef.current = palette[tema] || THEME_COLORS['matcha']

    const start = Date.now()
    let raf
    const render = () => {
      const t = (Date.now() - start) / 1000
      const c = colorsRef.current

      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)

      gl.uniform2f(locs.resolution, canvas.width, canvas.height)
      gl.uniform1f(locs.time, t)
      gl.uniform3f(locs.color1,    c.bg1[0],  c.bg1[1],  c.bg1[2])
      gl.uniform3f(locs.color2,    c.bg2[0],  c.bg2[1],  c.bg2[2])
      gl.uniform3f(locs.lineColor, c.line[0], c.line[1], c.line[2])

      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.vertexAttribPointer(locs.pos, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(locs.pos)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      gl.deleteProgram(prog)
      gl.deleteBuffer(buf)
    }
  }, []) // init once — colors update via colorsRef

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  )
}
