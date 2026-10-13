const cv = document.getElementById('c');
const gl = cv ? cv.getContext('webgl2') : null;
const root = document.documentElement;

// Theme is set first so the very first frame already uses the saved theme
try { root.dataset.theme = localStorage.getItem('theme') || 'dark'; } catch { root.dataset.theme = 'dark'; }

if (!gl) {
  const err = document.getElementById('err');
  if (err) err.hidden = false;
} else {
  // 1. WebGL Setup 
  const VS = `#version 300 es
  void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.-1., 0, 1); }`;

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
    return s;
  };

  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, document.getElementById('fs').textContent.trim()));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const U = n => gl.getUniformLocation(prog, n);
  const uR = U('r'), uM = U('m'), uT = U('t'), uK = U('k');
  let W, H, mx, my, tx, ty;
  let kk = root.dataset.theme === 'light' ? 0 : 1;   // start on the right theme, no fade-in from dark

  // 2. UI Elements & State
  const fpsMeter = document.getElementById('fps-meter');
  const fpsVal = document.getElementById('fps-val');
  const fpsStatus = document.getElementById('fps-status');
  const fpsFill = document.getElementById('fps-fill');

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animActive = !prefersReduced;

  let lastMs = performance.now();
  let frameCount = 0;
  let lastFpsUpdate = performance.now();
  let lastRenderTime = 0;

  // Auto-disable variables for slow hardware
  let slowFrames = 0;
  let warmUp = 45;
  const SLOW_FRAME_BUDGET = 42; // ~24 FPS
  const MAX_SLOW_FRAMES = 6;

  function fit() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = window.innerWidth * d;
    H = cv.height = window.innerHeight * d;
    gl.viewport(0, 0, W, H);
    if (mx === undefined) mx = tx = W / 2, my = ty = H / 2;
  }
  window.addEventListener('resize', () => {
    fit();
    if (!animActive) drawStatic();
  });
  fit();

  window.addEventListener('pointermove', e => {
    const d = W / window.innerWidth;
    tx = e.clientX * d;
    ty = H - e.clientY * d;
  });

  // Render a single static frame (used when paused or when theme changes)
  function drawStatic() {
    const dark = root.dataset.theme !== 'light';
    kk = dark ? 1 : 0;
    gl.uniform1f(uK, kk);
    gl.uniform2f(uR, W, H);
    gl.uniform2f(uM, mx, my);
    gl.uniform1f(uT, lastRenderTime);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Regular animated frame
  function render(timeSec) {
    mx += (tx - mx) * 0.06;
    my += (ty - my) * 0.06;
    const dark = root.dataset.theme !== 'light';
    kk += ((dark ? 1 : 0) - kk) * 0.12;

    gl.uniform1f(uK, kk);
    gl.uniform2f(uR, W, H);
    gl.uniform2f(uM, mx, my);
    gl.uniform1f(uT, timeSec);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Toggle animation on/off
  function toggleAnimation(forceState, offLabel = 'OFF') {
    const nextState = typeof forceState === 'boolean' ? forceState : !animActive;
    if (animActive === nextState) return;
    animActive = nextState;

    if (animActive) {
      if (fpsStatus) fpsStatus.textContent = 'LIVE';
      lastMs = performance.now();
      lastFpsUpdate = performance.now();
      frameCount = 0;
      slowFrames = 0;
      requestAnimationFrame(loop);
    } else {
      if (fpsStatus) fpsStatus.textContent = offLabel;
      if (fpsVal) fpsVal.textContent = '-- FPS';
      if (fpsFill) fpsFill.style.width = '0%';
      drawStatic(); // Lock onto a still frame
    }
  }

  // Press 'L' (or click / tap the FPS box) to turn animation ON / OFF
  window.addEventListener('keydown', e => {
    if (e.key === 'l' || e.key === 'L') {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      toggleAnimation();
    }
  });
  if (fpsMeter) {
    fpsMeter.addEventListener('click', () => toggleAnimation());
    fpsMeter.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAnimation(); }
    });
  }

  // 3. Render Loop
  function loop(ms) {
    if (!animActive) return;

    const delta = ms - lastMs;
    lastMs = ms;

    // Refresh FPS counter + bar every 250ms
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 250) {
      const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
      if (fpsVal) fpsVal.textContent = fps + ' FPS';
      if (fpsFill) fpsFill.style.width = Math.min(100, (fps / 60) * 100) + '%';
      frameCount = 0;
      lastFpsUpdate = now;
    }

    // Auto-disable trigger on consistently slow systems
    if (warmUp > 0) {
      warmUp--;
    } else if (delta > SLOW_FRAME_BUDGET) {
      slowFrames++;
      if (slowFrames >= MAX_SLOW_FRAMES) {
        toggleAnimation(false, 'AUTO-OFF');
        return;
      }
    } else {
      slowFrames = Math.max(0, slowFrames - 1);
    }

    lastRenderTime = ms / 1000;
    render(lastRenderTime);

    requestAnimationFrame(loop);
  }

  // Initial startup
  if (animActive) {
    requestAnimationFrame(loop);
  } else {
    if (fpsStatus) fpsStatus.textContent = 'OFF';
    drawStatic();
  }

  // 4. Theme Toggle (works continuously even when animation is OFF)
  const themeBtn = document.getElementById('theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('theme', root.dataset.theme); } catch {}

      // If animation is turned off, instantly repaint background in the chosen theme
      if (!animActive) drawStatic();
    });
  }
}
