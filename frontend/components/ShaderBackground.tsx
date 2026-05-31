"use client";

import { useEffect, useRef } from "react";

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;

  varying vec2 v_uv;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  uniform vec3 u_colorC;

  // u_time: seconds elapsed for slow fluid animation
  // u_resolution: viewport size to keep aspect ratio stable
  // u_colorA/B/C: palette stops for the light fluid gradient

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = v_uv;
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);

    float t = u_time * 0.05;
    vec2 drift = vec2(t, t * 0.75);
    float n = fbm(uv * aspect * 2.2 + drift);
    float n2 = fbm(uv * aspect * 3.4 - drift * 1.2);

    float blend = smoothstep(0.2, 0.8, n);
    float blend2 = smoothstep(0.1, 0.9, n2);

    vec3 color = mix(u_colorA, u_colorB, blend);
    color = mix(color, u_colorC, blend2 * 0.6);

    float grain = random(uv * u_resolution.xy) * 0.02;
    color += grain;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function parseCssColor(value: string) {
  const hex = value.trim().replace("#", "");
  if (hex.length !== 6) return [1, 1, 1];
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!program) return;

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const colorALocation = gl.getUniformLocation(program, "u_colorA");
    const colorBLocation = gl.getUniformLocation(program, "u_colorB");
    const colorCLocation = gl.getUniformLocation(program, "u_colorC");

    const vertices = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      gl.viewport(0, 0, innerWidth, innerHeight);
    };

    resize();
    window.addEventListener("resize", resize);

    const style = getComputedStyle(document.documentElement);
    const colorA = parseCssColor(style.getPropertyValue("--shader-color-a"));
    const colorB = parseCssColor(style.getPropertyValue("--shader-color-b"));
    const colorC = parseCssColor(style.getPropertyValue("--shader-color-c"));

    const start = performance.now();

    const render = () => {
      const now = performance.now();
      const elapsed = (now - start) / 1000;

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      if (timeLocation) gl.uniform1f(timeLocation, elapsed);
      if (resolutionLocation)
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      if (colorALocation) gl.uniform3f(colorALocation, colorA[0], colorA[1], colorA[2]);
      if (colorBLocation) gl.uniform3f(colorBLocation, colorB[0], colorB[1], colorB[2]);
      if (colorCLocation) gl.uniform3f(colorCLocation, colorC[0], colorC[1], colorC[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-full w-full z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
