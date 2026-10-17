// A CRT screen for a Play tab: the game's picture drawn again over its canvas, on the GPU with
// WebGL2, through Timothy Lottes's public-domain CRT shader at the libretro preset's defaults
// (libretro glsl-shaders, crt/shaders/crt-lottes.glsl: "Please take and use, change, or
// whatever"). Each line is a Gaussian beam in linear light, a soft bloom spreads bright detail,
// the picture is curved a little like a tube and a shadow mask is drawn on the screen's own
// pixels. No dependencies. Exposes CRT (window.CRT on a page; globalThis.CRT in node, for tests).
//
//   const crt = CRT.attach(canvas, { button, source, pixel, onChange })
//     canvas    the page's game canvas: the CRT picture covers it exactly and lets clicks through
//     button    the page's switch, a <button> whose aria-pressed this keeps; hidden where the
//               browser has no WebGL2
//     source    the canvas that holds the C64's frame (default: canvas), for a page that scales
//               its picture into the canvas it shows
//     pixel     source pixels to a C64 pixel (default 1; 2 for a page that draws at twice size)
//     onChange  called with true or false when the screen is switched, so a page can turn off
//               what cannot be drawn through it (a view at the screen's own resolution)
//   crt.on, crt.set(on), crt.frame()
// A page makes no call per frame: every putImageData and drawImage on canvas's 2D context draws
// the CRT picture again, from source, at the next animation frame (crt.frame() does the same for
// a page that draws some other way). The viewer's choice holds on every Play tab
// (localStorage 'gamesexplained.crt'), and it starts off.
(function (root) {
  'use strict';
  const KEY = 'gamesexplained.crt';

  const VS = `#version 300 es
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

  // Lottes's shader with its defaults written in. The source is an sRGB texture, so a fetch is
  // already linear (his ToLinear, with brightBoost 1); the horizontal weights depend only on the
  // pixel's place across its texel, so they are worked out once for all five lines.
  const FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uSrc; uniform ivec2 uSize; uniform vec2 uOut; uniform int uPixel;
out vec4 o;
const float hardScan = -8.0, hardPix = -3.0, warpX = 0.031, warpY = 0.041, maskDark = 0.5, maskLight = 1.5;
const float hardBloomPix = -1.5, hardBloomScan = -2.0, bloomAmount = 0.15;
float gaus(float x, float s) { return exp2(s * x * x); }
float srgb(float c) { return c < 0.0031308 ? c * 12.92 : 1.055 * pow(c, 0.41666) - 0.055; }
void main() {
  vec2 pos = vec2(gl_FragCoord.x, uOut.y - gl_FragCoord.y) / uOut;
  pos = pos * 2.0 - 1.0;
  pos *= vec2(1.0 + pos.y * pos.y * warpX, 1.0 + pos.x * pos.x * warpY);
  pos = pos * 0.5 + 0.5;
  if (pos.x <= 0.0001 || pos.x >= 0.9999 || pos.y <= 0.0001 || pos.y >= 0.9999) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec2 q = pos * vec2(uSize), dst = 0.5 - fract(q);
  ivec2 c = ivec2(floor(q));
  float hp[7], hb[7];
  for (int k = 0; k < 7; k++) { float x = dst.x + float(k - 3); hp[k] = gaus(x, hardPix); hb[k] = gaus(x, hardBloomPix); }
  float w3 = hp[2] + hp[3] + hp[4], w5 = w3 + hp[1] + hp[5], w7 = hb[0] + hb[1] + hb[2] + hb[3] + hb[4] + hb[5] + hb[6];
  vec3 tri = vec3(0.0), bloom = vec3(0.0);
  for (int l = 0; l < 5; l++) {
    int y = clamp(c.y + l - 2, 0, uSize.y - 1);
    vec3 s3 = vec3(0.0), s5 = vec3(0.0), s7 = vec3(0.0);
    for (int k = 0; k < 7; k++) {
      vec3 t = texelFetch(uSrc, ivec2(clamp(c.x + k - 3, 0, uSize.x - 1), y) * uPixel, 0).rgb;
      s7 += t * hb[k];
      if (k >= 1 && k <= 5) s5 += t * hp[k];
      if (k >= 2 && k <= 4) s3 += t * hp[k];
    }
    float off = float(l - 2), sy = dst.y + off;
    if (l == 2) tri += s5 / w5 * gaus(sy, hardScan);
    else if (l == 1 || l == 3) tri += s3 / w3 * gaus(sy, hardScan);
    bloom += (l == 0 || l == 4 ? s5 / w5 : s7 / w7) * gaus(sy, hardBloomScan);
  }
  vec3 col = tri + bloom * bloomAmount;
  vec2 m = gl_FragCoord.xy * 1.000001;                     // the stretched VGA shadow mask
  m.x = fract((m.x + m.y * 3.0) * 0.166666666);
  vec3 mask = vec3(maskDark);
  if (m.x < 0.333) mask.r = maskLight; else if (m.x < 0.666) mask.g = maskLight; else mask.b = maskLight;
  col = clamp(col * mask, 0.0, 1.0);
  o = vec4(srgb(col.r), srgb(col.g), srgb(col.b), 1.0);
}`;

  const supported = () => typeof root.WebGL2RenderingContext === 'function';
  function stored() { try { return root.localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function store(on) { try { root.localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* no storage: the choice lasts for this visit */ } }

  // The canvas's backing size in the screen's own pixels: the browser's exact count where it gives
  // one that agrees with the CSS size times the pixel ratio (an emulated ratio can disagree),
  // otherwise that product rounded
  function devicePixels(entry, ratio) {
    const w = Math.round(entry.contentRect.width * ratio), h = Math.round(entry.contentRect.height * ratio);
    const d = entry.devicePixelContentBoxSize && entry.devicePixelContentBoxSize[0];
    if (d && Math.abs(d.inlineSize - w) <= 2 && Math.abs(d.blockSize - h) <= 2) return [d.inlineSize, d.blockSize];
    return [w, h];
  }

  function attach(canvas, opts) {
    opts = opts || {};
    const source = opts.source || canvas, pixel = opts.pixel || 1, button = opts.button || null;
    let cv = null, gl = null, prog = null, u = null, tex = null, tw = 0, th = 0, lost = false, queued = false;
    const api = { on: false, set, frame };

    function build() {
      gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
      if (!gl) return false;
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) { console.error('CRT shader: ' + gl.getShaderInfoLog(s)); return false; }
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) { console.error('CRT shader: ' + gl.getProgramInfoLog(p)); return false; }
      prog = p;
      u = { src: gl.getUniformLocation(p, 'uSrc'), size: gl.getUniformLocation(p, 'uSize'), out: gl.getUniformLocation(p, 'uOut'), pixel: gl.getUniformLocation(p, 'uPixel') };
      tex = gl.createTexture(); tw = th = 0;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.bindVertexArray(gl.createVertexArray());
      return true;
    }
    // The CRT canvas, made the first time the screen is switched on, placed over canvas in the
    // same parent so that it scrolls and scales with it
    function make() {
      if (cv) return !!prog;
      cv = document.createElement('canvas');
      cv.className = 'crt-screen'; cv.setAttribute('aria-hidden', 'true');
      Object.assign(cv.style, { position: 'absolute', display: 'none', pointerEvents: 'none', imageRendering: 'auto', margin: '0', padding: '0', border: '0' });
      const parent = canvas.parentElement;
      if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
      canvas.insertAdjacentElement('afterend', cv);
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; });
      cv.addEventListener('webglcontextrestored', () => { lost = false; if (build()) frame(); });
      const ro = new ResizeObserver(es => {
        for (const e of es) {
          if (e.target !== cv) { place(); continue; }
          const [w, h] = devicePixels(e, root.devicePixelRatio || 1);
          if (w && h && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; }
          frame();
        }
      });
      try { ro.observe(cv, { box: 'device-pixel-content-box' }); } catch (e) { ro.observe(cv); }
      ro.observe(canvas); ro.observe(parent);
      root.addEventListener('resize', place);
      return build();
    }
    // from the boxes as laid out, to the fraction of a pixel (offsetLeft and offsetTop round)
    function place() {
      if (!cv) return;
      const s = cv.style, p = canvas.parentElement, a = canvas.getBoundingClientRect(), b = p.getBoundingClientRect();
      s.left = (a.left - b.left - p.clientLeft + p.scrollLeft) + 'px'; s.top = (a.top - b.top - p.clientTop + p.scrollTop) + 'px';
      s.width = a.width + 'px'; s.height = a.height + 'px';
      s.borderRadius = getComputedStyle(canvas).borderRadius;
    }
    function frame() { if (api.on && !queued) { queued = true; root.requestAnimationFrame(draw); } }
    function draw() {
      queued = false;
      if (!api.on || !gl || lost || !cv.width || !source.width) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      if (tw !== source.width || th !== source.height) {
        tw = source.width; th = source.height;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
      } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.src, 0);
      gl.uniform2i(u.size, Math.floor(tw / pixel), Math.floor(th / pixel));
      gl.uniform2f(u.out, cv.width, cv.height);
      gl.uniform1i(u.pixel, pixel);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // quiet: the screen as the viewer left it, set while the page starts, without onChange
    function set(on, quiet) {
      on = !!on;
      if (on && !make()) { on = false; if (button) button.style.display = 'none'; }
      const was = api.on;
      api.on = on;
      if (cv) cv.style.display = on ? 'block' : 'none';
      if (button) button.setAttribute('aria-pressed', String(on));
      store(on);
      if (on) { place(); frame(); }
      if (on !== was && !quiet && opts.onChange) opts.onChange(on);
      return on;
    }

    if (!supported()) { if (button) button.style.display = 'none'; return api; }
    const ctx = canvas.getContext('2d');
    if (ctx) for (const m of ['putImageData', 'drawImage']) {
      const f = ctx[m];
      ctx[m] = function () { const r = f.apply(this, arguments); frame(); return r; };
    }
    if (button) {
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => set(!api.on));
    }
    if (stored()) set(true, true);
    return api;
  }

  root.CRT = { attach, supported, KEY, VS, FS };
})(typeof window !== 'undefined' ? window : globalThis);
