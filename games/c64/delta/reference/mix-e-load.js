// Mix-E-Load, the program Delta's tape runs while the rest of the game loads: a Rob Hubbard tune the
// player remixes with the joystick, under the Delta logo and a scrolling message. Its bytes, as the
// loader starts it, are in music.html (mixe-data); test_mix_e_load.js holds this file to them and
// the sound to the emulator's.

/* mix-e-load */
// createMixeLoad(D, C64Cpu) runs the program's own code on the kit's 6502 (C64Cpu, from
// ../../lib/cpu6502.js). D is the page's mixe-data: blocks [[address, base64], ...], the video
// chip's 47 registers and CIA 2's port A as the loader leaves them. Memory banked as the program
// banks it ($01 = $05: RAM at $A000-$BFFF and $E000-$FFFF, the chips at $D000).
//   reset()        the start, as the loader's last step makes it ($ED4F): the tune set up ($CCDD,
//                  which calls $C00C with A = 0), the screen ($CD49) and the first frame's scroll.
//                  Returns the SID writes
//   frame(bits)    one pass of the main loop, a frame: the loop's body from $CF6A, which plays the
//                  music ($C012) every frame and every fifth frame reads the joystick ($CDD1),
//                  flashes the chosen column ($CD8E), picks a random lead phrase and bass transpose
//                  ($CE6B) and moves the twinkle ($CEB5); then the next frame's scroller ($CFA0),
//                  which the program runs from line 226, after waiting for it ($CF60). bits is the
//                  joystick in port 2 (1 up, 2 down, 4 left, 8 right, 16 fire). Returns the frame's
//                  SID writes [register, value, ...]
//   choose(c, i)   option i of column c (0 lead, 1 bass, 2 drums, 3 fx) into the lit middle row, as
//                  the joystick gets it there: the column chosen ($CF53, and $CD02 to light it) and
//                  the option set through the program's own $CE05
//   column(c)      { names, first, lit, now }: the column's options, the one in the top row and the
//                  one in the lit row; now is the column the joystick is on
//   picture()      the frame for C64.drawFrame (site/lib/c64.js): the registers, memory and colour
//                  RAM as they stand, with the bottom row's scroll from line 226
//   regs           the SID's 25 registers as the program has written them
function createMixeLoad(D, C64Cpu) {
  const mem = new Uint8Array(0x10000), vic = new Uint8Array(47), colour = new Uint8Array(1024), regs = new Uint8Array(25);
  const b64 = (s) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
  const blocks = D.blocks.map(([a, s]) => [a, b64(s)]);
  let joy = 0, sid = [], scroll = -1;
  const io = {
    read(a) {
      if (a === 0xDC00) return 0xFF & ~joy;               // CIA 1 port A: port 2's joystick, low for pressed
      if (a === 0xD012) return 0;                         // the raster: the scroller's wait for the frame's end ends at once
      if (a < 0xD02F) return vic[a - 0xD000];
      if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800];
      return 0;
    },
    write(a, v) {
      if (a >= 0xD400 && a <= 0xD418) { sid.push(a - 0xD400, v); regs[a - 0xD400] = v; }
      else if (a < 0xD02F) { if (a === 0xD016 && scroll < 0) scroll = v; vic[a - 0xD000] = v; }
      else if (a >= 0xD800 && a < 0xDC00) colour[a - 0xD800] = v & 15;
    },
  };
  const cpu = new C64Cpu.CPU(mem, { port: { dir: 0x2F, data: 0x05 }, io });
  const opts = { maxSteps: 200000 };
  const keep = {};
  const LISTS = [[], [], [], []];
  // a column's options, as $CD0D prints them: eight screen codes each, the first with bit 7 set,
  // from the list the column's pointer names ($BFCE and $BFD2), to the 0 that ends it
  function names(c) {
    const out = [];
    let a = mem[0xBFCE + c] | mem[0xBFD2 + c] << 8;
    while (mem[a] & 0x80) {
      let s = '';
      for (let k = 0; k < 8; k++) { const ch = mem[a + k] & 0x3F; s += ch === 0 ? '@' : ch < 27 ? String.fromCharCode(64 + ch) : String.fromCharCode(ch); }
      out.push(s.trim()); a += 8;
    }
    return out;
  }
  function reset() {
    mem.fill(0); colour.fill(0); regs.fill(0);
    for (const [a, b] of blocks) mem.set(b, a);
    vic.set(D.vic);
    joy = 0; sid = [];
    cpu.call(0xCCDD, {}, opts);
    cpu.call(0xCD49, {}, opts);
    for (let c = 0; c < 4; c++) LISTS[c] = names(c);
    scroller();
    const w = sid; sid = [];
    return w;
  }
  function scroller() { scroll = -1; cpu.call(0xCFA0, {}, opts); }
  function frame(bits) {
    joy = bits & 0x1F; sid = [];
    cpu.pc = 0xCF6A; cpu.sp = 0xFF;
    cpu.run(Object.assign({ until: 0xCF60 }, opts));
    const w = sid;
    scroller();
    return w;
  }
  function choose(c, i) {
    const n = mem[0xBFCA + c] + 1;
    mem[0xCF55 + c] = (i - 2 + 2 * n) % n;
    if (mem[0xCF53] !== c) { mem[0xCF53] = c; cpu.call(0xCD02, {}, opts); }
    cpu.call(0xCE05, { x: c }, opts);
  }
  function column(c) {
    const n = mem[0xBFCA + c] + 1, first = mem[0xCF55 + c];
    return { names: LISTS[c], first, lit: (first + 2) % n, now: mem[0xCF53] };
  }
  function picture() {                                    // the frame after the last frame(): lines 226 on scrolled
    return { vic: Array.from(vic), cia2: D.cia2, mem, colourMem: colour, keep,
      writes: scroll < 0 ? [] : [[226, 20, 0xD016, scroll | 0xC0], [256, 20, 0xD016, vic[0x16] | 0xC0]] };
  }
  reset();
  return { reset, frame, choose, column, picture, mem, vic, colour, regs };
}
// end of mix-e-load

// The widget in music.html: the program's screen, drawn every frame with C64.drawFrame
// (../../lib/c64.js), and its sound through C64Sid.host (../../lib/sid.js), which plays the writes
// each frame makes. The joystick is the arrow keys and space on the screen, or the buttons under
// it; a click on an option's name gets it into the lit row as the joystick would.
(function () {
  'use strict';
  const root = typeof document !== 'undefined' && document.getElementById('mixe');
  if (!root) return;
  const dataEl = document.getElementById('mixe-data');
  if (!globalThis.C64 || !globalThis.C64Cpu || !globalThis.C64Sid || !dataEl) {
    root.textContent = 'This widget needs the site\u2019s shared scripts: open the page from the built site, not from disk.';
    return;
  }
  const M = createMixeLoad(JSON.parse(dataEl.textContent), C64Cpu);
  const HEADS = ['Lead', 'Bass', 'Drums', 'FX'];
  const STICK = [[4, '\u25C0', 'left'], [8, '\u25B6', 'right'], [1, '\u25B2', 'up'], [2, '\u25BC', 'down'], [16, 'Fire', 'fire']];
  root.innerHTML =
    '<canvas class="mx-cv" tabindex="0" aria-label="Mix-E-Load\u2019s screen. Arrow keys and space work the joystick"></canvas>' +
    '<div class="row"><button type="button" data-go>\u25B6 Play Mix-E-Load</button>' +
    '<span class="lab mx-stick">Joystick</span>' +
    STICK.map(([b, t, n]) => `<button type="button" data-j="${b}" aria-label="Joystick ${n}">${t}</button>`).join('') + '</div>' +
    '<div class="mx-cols">' + HEADS.map((h, c) => `<div data-col="${c}"><p class="lab">${h}</p>` +
      M.column(c).names.map((n, i) => `<button type="button" data-c="${c}" data-i="${i}">${n}</button>`).join('') + '</div>').join('') +
    '</div>';
  const cv = root.querySelector('canvas'), goBtn = root.querySelector('[data-go]');
  const FPS = 985248 / (312 * 63);                          // PAL frames a second
  let host = null, running = false, t0 = 0, done = 0, held = 0, tapped = 0, raf = 0;
  function draw() { C64.drawFrame(cv, M.picture(), 1); }
  function show() {
    for (let c = 0; c < 4; c++) {
      const k = M.column(c);
      root.querySelectorAll(`[data-c="${c}"]`).forEach((b) => b.classList.toggle('on', +b.dataset.i === k.lit));
      root.querySelector(`[data-col="${c}"] p`).classList.toggle('mx-now', k.now === c);
    }
  }
  function tick(now) {
    if (!running) return;
    const due = Math.floor((now - t0) / 1000 * FPS), frames = [];
    while (done < due && frames.length < 10) {
      frames.push(Array.from(M.frame(held | tapped)));
      if (M.mem[0xCF5F] === 0) tapped = 0;                  // the stick was read ($CDD1 runs every fifth frame)
      done++;
    }
    done = Math.max(done, due);                              // after a pause (a hidden tab), go on from now
    if (frames.length) { host.push(frames); draw(); show(); }
    raf = requestAnimationFrame(tick);
  }
  async function go() {
    if (running) { stop(); return; }
    try { if (!host) host = await C64Sid.host({ live: true, filter: '6581', gain: 0.5 }); }
    catch (e) { root.querySelector('.lab').textContent = 'No sound: ' + e.message; return; }
    if (host.ctx.resume) host.ctx.resume();
    host.push([Array.from(M.regs).flatMap((v, r) => [r, v])]);
    running = true; t0 = performance.now(); done = 0;
    goBtn.textContent = '\u25A0 Stop'; goBtn.classList.add('on');
    raf = requestAnimationFrame(tick);
    cv.focus({ preventScroll: true });
  }
  function stop() {
    running = false; cancelAnimationFrame(raf);
    if (host) host.push([[4, 0, 11, 0, 18, 0, 24, 0]]);   // gates off, volume 0
    goBtn.textContent = '\u25B6 Play Mix-E-Load'; goBtn.classList.remove('on');
  }
  goBtn.addEventListener('click', go);
  const press = (b) => { held |= b; tapped |= b; }, lift = (b) => { held &= ~b; };
  root.querySelectorAll('[data-j]').forEach((el) => {
    const b = +el.dataset.j;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); press(b); });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(t, () => lift(b));
  });
  const KEYS = { ArrowUp: 1, ArrowDown: 2, ArrowLeft: 4, ArrowRight: 8, ' ': 16 };
  cv.addEventListener('keydown', (e) => { const b = KEYS[e.key]; if (!b) return; e.preventDefault(); if (!e.repeat) press(b); });
  cv.addEventListener('keyup', (e) => { const b = KEYS[e.key]; if (b) lift(b); });
  cv.addEventListener('blur', () => { held = 0; });
  root.querySelectorAll('[data-c]').forEach((el) => el.addEventListener('click', () => {
    M.choose(+el.dataset.c, +el.dataset.i); show(); if (!running) draw();
  }));
  draw(); show();
})();
