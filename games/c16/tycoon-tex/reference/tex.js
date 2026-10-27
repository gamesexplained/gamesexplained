/* tex.js */
// Tycoon Tex's pages run the game's own routines on the kit's 6502 (C64Cpu, from ../../lib/cpu6502.js)
// over the memory the listing records (C16.load), with the C16's 16 KB of RAM repeating through the
// 64 KB ({ ramSize: 0x4000 }) and the chips served by the site's model of them, C16.io: the
// registers read back as written, with the bits that read 1; the joystick and keyboard latch from
// what the page holds down; every write to the sound registers into a log; and here, the timers and
// the raster as random numbers. Pictures are drawn with the
// site's TED screen, C16.renderBands. index.html, discoveries.html and levels.html load it after
// those two; test_tex.js beside the pages holds it to the listing and to plus4emu's picture and sound.
//
//   Tex.fresh(L, rnd) -> m          a copy of the listing's memory after start ($1800) has run to its
//                                   jump to the menu ($1823): zero page cleared, the screen cleared
//                                   (the KERNAL's BSOUT stood in for), the skyline and the pipe filled
//   Tex.startLevel(m, k, o, rnd)    start_game ($29D3) up to its countdown ($2A1B), with next_level
//                                   starting level k (1 to 99, or 100 for 00) in its scene, then play
//                                   on ($2A1E-$2A22) and the message row filled (scroll_message, 320
//                                   times). o.difficulty 0 to 2; o.enemies false (the default) clears
//                                   enemy_mask, so that none comes
//   Tex.Run(m, rnd, hooks) -> run   the five raster interrupts of a frame, in their order, as irq ($18A9)
//                                   jumps to them: run.step({ left, right, up, fire }) runs one frame
//                                   with the joystick in port 2 held so; run.shown is the 16 KB as
//                                   TED read it for rows 0 to 23 (memory at irq_pipe's entry, $1B7F),
//                                   and run.picture() the frame drawn. The main loop is not run: no
//                                   pressure drain, no running points, no bouncy bomb or crash
//                                   explosive. The lives are kept at 3, so that a death never ends it.
//                                   run.finish(input) runs the frame's last two interrupts, for
//                                   memory stopped at irq_pipe's entry. hooks: more, for a test
//   Tex.bands(shown, end) -> bands  the five bands' registers as each interrupt writes them, from the
//                                   variables in shown, for C16.renderBands: rows 0 to 23 from shown,
//                                   row 24 from end (default shown)
//   Tex.picture(shown, end, o)      { w: 320, h: 200, px }, drawn so; o.one draws the whole window with
//                                   the last band's registers, as one read of TED at the frame's end
//   Tex.draw(canvas, pic, s)        a picture onto a canvas, s times its size
//   Tex.nextLevel(m, k, pick)       next_level ($3A31) for level k (1 to 99, 100 for 00), its random
//                                   choice of enemies forced to entry pick of enemy_pairs or
//                                   enemy_triples: { level, scene, mask, threshold, breakParts, delay }
//   Tex.deadly(m) -> flags          the 256 characters, 1 for each that check_hole ($1ED7) kills on
//   Tex.jumps(m, s, middles, rnd)   every frame Tex can jump a break from at speed s, and whether
//                                   he clears it (below, over the function); Tex.tryJump(start,
//                                   at) runs one of them again, with its frames, for a page to draw
//   Tex.sound(L, name, o) -> log    an effect as the game makes it, in the kit-c16-sound format of
//                                   site/lib/ted-sound.js: 'shot' (shot_sound, from fire_bullet in
//                                   irq_field), 'hit' (hit_sound, from move_bullet in irq_frame) and
//                                   'count' (the level's pressure counted into the score,
//                                   level_complete $3916-$3944), each then followed by tick_sounds in
//                                   irq_scroller, once a frame. o.meant: the shot with its falling high
//                                   bits put into voice 1's register, $FF12, where $3674 ORs them into
//                                   voice 2's, $FF10. o.cells, o.fine: the pressure left for 'count'
//                                   (default 25 and 7, a full bar)
//
// rnd(address) gives the byte a read of TED's timers or raster at address returns ($FF00-$FF05,
// $FF0B, $FF1C-$FF1E): the game reads them as random numbers. The default is Math.random's.
globalThis.Tex = (function () {
  const FRAME = 35568, CLOCK = 1773447;
  const R = { start: 0x1800, toMenu: 0x1823, startGame: 0x29D3, nextLevelCall: 0x2A12, countdown: 0x2A1B,
    nextLevel: 0x3A31, out: 0x18DD, bands: [0x1ACC, 0x1B21, 0x1B4C, 0x1B7F, 0x1BAD], pipeEntry: 0x1B7F,
    scrollMessage: 0x226A, tickSounds: 0x361B, shotSound: 0x3628, hitSound: 0x367B, delay: 0x1922,
    count: [0x3916, 0x3942], bsout: 0xFFD2 };
  // The reads the game takes as random numbers: the timers, the raster compare and the beam's place
  const RANDOM = a => (a >= 0xFF00 && a <= 0xFF05) || a === 0xFF0B || (a >= 0xFF1C && a <= 0xFF1E);
  const byte = () => Math.random() * 256 | 0;
  const bcd = n => ((n / 10 | 0) << 4) | n % 10;

  // A 6502 over m, the chips served by the site's model of them (C16.io): held is the joystick in
  // port 2 (bits active high: 1 up, 2 down, 4 left, 8 right, 128 fire), log an array for the
  // sound's writes and now() their cycle
  function cpuFor(m, rnd = byte, o = {}) {
    const io = C16.io(m, { read: a => (RANDOM(a) ? rnd(a) : undefined), log: o.log, now: o.now && (() => o.now(c)) });
    const c = new C64Cpu.CPU(m, { ramSize: 0x4000, ioPages: [0xFD, 0xFF], io });
    c.sp = 0xFF;
    c.held = held => { io.joy = 0x1F & ~((held & 0x0F) | (held & 0x80 ? 0x10 : 0)); };
    return c;
  }
  // The KERNAL's BSOUT, which start calls once, with $93: the screen cleared to spaces
  const KERNAL = m => ({ [R.bsout]: c => { m.fill(0x20, 0x0C00, 0x0FE8); c.rts(); } });

  function fresh(L, rnd = byte) {
    const m = L.ram.slice();
    // TED as the KERNAL leaves it: 25 rows, 40 columns, the screen at $0800
    m[0xFF06] = 0x1B; m[0xFF07] = 0x08; m[0xFF12] = 0xC4; m[0xFF14] = 0x08;
    const c = cpuFor(m, rnd);
    c.pc = R.start;
    c.run({ until: R.toMenu, hooks: KERNAL(m) });
    // seed_random ($18EB), which menu calls each time it starts: the characters from RAM
    m[0xFF12] &= 0xFB;
    return m;
  }

  function startLevel(m, k, o = {}, rnd = byte) {
    m[0x182B] = o.difficulty || 0;
    m[0x15] = 0xA9; m[0x16] = 0x0E;                     // tex_cell where the last game left it
    const c = cpuFor(m, rnd);
    c.pc = R.startGame;
    c.run({ until: R.countdown, maxSteps: 2e6, hooks: { [R.nextLevelCall]: () => {
      m[0x62] = bcd((k - 1) % 100);                    // the level before k, in decimal
      m[0x1826] = ((k - 1) % 3 + 2) % 3;               // and its scene, so next_level moves on to k's
    } } });
    m[0x7F] = 0; m[0x38] = 0;                          // $2A1E-$2A22: controls on, the menu off
    if (!o.enemies) m[0xA6] = 0;
    for (let i = 0; i < 320; i++) c.call(R.scrollMessage);
    return m;
  }

  function Run(m, rnd = byte, more = {}) {
    const c = cpuFor(m, rnd), shown = new Uint8Array(0x4000);
    let frame = 0;
    const hooks = Object.assign({}, more, { [R.pipeEntry]: () => { shown.set(m.subarray(0, 0x4000)); } });
    return {
      m, shown, get frame() { return frame },
      step(input = {}) {
        c.held((input.up ? 1 : 0) | (input.left ? 4 : 0) | (input.right ? 8 : 0) | (input.fire ? 0x80 : 0));
        m[0x80] = 3; m[0x0C65] = 0x33;                 // three lives, and the TYCOONS digit
        for (const band of R.bands) {
          m[0x6B] = R.bands.indexOf(band);             // irq_band, as irq steps it
          c.pc = band; c.sp = 0xFF;
          c.run({ until: R.out, hooks, maxSteps: 2e5 });
        }
        frame++;
        return this;
      },
      // the rest of a frame for memory stopped at irq_pipe's entry, as a snapshot made there holds it
      finish(input = {}) {
        c.held((input.up ? 1 : 0) | (input.left ? 4 : 0) | (input.right ? 8 : 0) | (input.fire ? 0x80 : 0));
        for (const band of R.bands.slice(3)) { m[0x6B] = R.bands.indexOf(band); c.pc = band; c.sp = 0xFF; c.run({ until: R.out, hooks, maxSteps: 2e5 }); }
        frame++;
        return this;
      },
      picture(o) { return picture(shown, m, o) },
    };
  }

  // The registers each band's interrupt writes (irq_frame, irq_skyline, irq_field, irq_pipe,
  // irq_scroller), on TED as the KERNAL and seed_random leave it: $FF06 $1B, $FF12 $C0, $FF14 $08.
  // Lines 0 to 23 of the window are irq_frame's, line 24 its colours with irq_skyline's $FF07 and
  // $FF13 (irq_skyline writes them first, on that line), 25 to 63 the skyline's, 64 to 175 the play
  // field's, 176 to 191 the pipe's and 192 to 199 the message's.
  function bands(shown, end = shown) {
    const z = a => shown[a];
    const T = r => Object.assign({ 0x06: 0x1B, 0x12: 0xC0, 0x14: 0x08, 0x19: 0x70 }, r);
    const top = T({ 0x07: 0x18, 0x13: 0x3C, 0x15: 0x70, 0x16: 0x51, 0x17: 0x31 });
    const sky = T({ 0x07: 0x90 | z(0x06), 0x13: 0x10, 0x15: z(0x75), 0x16: z(0x97), 0x17: z(0x98) });
    const field = T({ 0x07: 0x10, 0x13: 0x3C, 0x15: z(0x96), 0x16: z(0x94), 0x17: z(0x95) });
    const pipe = T({ 0x07: 0x90 | z(0x1B), 0x13: 0x10, 0x15: z(0x76), 0x16: z(0x9A), 0x17: z(0x9B) });
    const msg = T({ 0x07: 0x10 | z(0x1C), 0x13: 0x3C, 0x15: z(0x76), 0x16: z(0x9A), 0x17: z(0x9B) });
    const mix = Object.assign({}, top, { 0x07: sky[0x07], 0x13: sky[0x13] });
    return [
      { y0: 0, y1: 23, mem: shown, ted: top }, { y0: 24, y1: 24, mem: shown, ted: mix },
      { y0: 25, y1: 63, mem: shown, ted: sky }, { y0: 64, y1: 175, mem: shown, ted: field },
      { y0: 176, y1: 191, mem: shown, ted: pipe }, { y0: 192, y1: 199, mem: end, ted: msg },
    ];
  }
  function picture(shown, end, o = {}) {
    const b = bands(shown, end);
    if (o.one) return C16.renderBands([{ y0: 0, y1: 199, mem: end || shown, ted: b[5].ted }], { size: 0x4000 });
    return C16.renderBands(b, { size: 0x4000 });
  }
  let tmp;
  function draw(canvas, pic, s = 1) {
    if (canvas.width !== pic.w * s || canvas.height !== pic.h * s) { canvas.width = pic.w * s; canvas.height = pic.h * s; }
    const ctx = canvas.getContext('2d'), img = new ImageData(C16.rgba(pic), pic.w, pic.h);
    if (s === 1) { ctx.putImageData(img, 0, 0); return; }
    tmp = tmp || document.createElement('canvas');
    tmp.width = pic.w; tmp.height = pic.h; tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, pic.w * s, pic.h * s);
  }

  function nextLevel(m, k, pick = 0) {
    m[0x62] = bcd((k - 1) % 100); m[0x1826] = ((k - 1) % 3 + 2) % 3;
    const c = cpuFor(m, () => 0);
    // the AND that takes the pair's or the triple's entry from the random byte
    c.call(R.nextLevel, {}, { maxSteps: 2e6, hooks: { 0x3A84: cpu => { cpu.a = pick % 6; }, 0x3AA1: cpu => { cpu.a = pick % 4; } } });
    return { level: m[0x62], scene: m[0x1826], mask: m[0xA6], threshold: m[0xE5], breakParts: m[0x64], delay: m[0xE1] };
  }

  // The characters check_hole ($1ED7) kills on, each tried under Tex on a copy of m: 256 flags
  function deadly(m) {
    const s = m.slice(), c = cpuFor(s), out = new Uint8Array(256);
    s[0x15] = 0xA9; s[0x16] = 0x0E;
    for (let ch = 0; ch < 256; ch++) { s[0x0EA9 + 200] = ch; s[0x7B] = 0; c.call(0x1ED7); out[ch] = s[0x7B]; }
    return out;
  }
  const texColumn = m => (m[0x15] + (m[0x16] << 8) - 0x0C00) % 40;

  // Tex.jumps(m, s, middles, rnd): every time Tex can jump a break at speed s (1 to 7). On m, a level
  // as Tex.startLevel leaves it, he walks right until set_speed gives speed s, with the two deaths
  // turned off meanwhile (the operands at $1EB7 and $1EEC, as Plus/4 World's invulnerability pokes
  // turn them off); then the pipe is laid plain under the whole row and a break of 1 to 3 middles is
  // put next in the feed (build_break, its two random bits set for the count). The break comes in at
  // the right and scrolls under him. Each frame from when its first deadly column is 24 columns ahead
  // of his left column until he falls into it standing is a try: up held that frame, then nothing
  // until he falls (tex_hit) or the break has gone by. -> { start, deadly, tries: [{ at, ahead,
  // fine, cleared }] }: start is the memory the tries begin from, at the frames from start to the
  // jump, ahead the columns from his left column to the break's first deadly one, fine the pipe's
  // fine scroll ($1B), cleared whether he landed past it. Tex.tryJump(start, at) runs one again
  // and returns { cleared, frames }, each frame a run.shown copy, for a page to draw.
  function jumps(m, s, middles = 1, rnd = byte) {
    const run = Run(m, rnd), save = [m[0x1EB7], m[0x1EEC]], DEADLY = deadly(m);
    m[0x1EB7] = 0; m[0x1EEC] = 0;
    for (let f = 0; f < 600 && m[0x70] !== s; f++) run.step({ right: 1 });
    run.step({});
    m[0x1EB7] = save[0]; m[0x1EEC] = save[1]; m[0x7B] = 0; m[0xC1] = 0;
    // the plain pipe ($C8-$CB, two columns) under the row, the break next in the feed, and the
    // next break 18 pieces off (break_timer)
    for (let c = 0; c < 40; c++) { m[0x0F70 + c] = c & 1 ? 0xCB : 0xC9; m[0x0F98 + c] = c & 1 ? 0xCA : 0xC8; }
    m[0x64] = 3; m[0x0E] = middles > 1 ? 1 : 0; m[0x10] = middles > 2 ? 1 : 0;
    cpuFor(m, rnd).call(0x308E);
    m[0xB1] = 0x12;
    const start = m.slice(), tries = [];
    const ahead = mem => { const l = texColumn(mem); for (let c = l; c < 40; c++) if (DEADLY[mem[0x0F70 + c]]) return c - l; return -1; };
    for (let f = 0; f < 2000 && !m[0x7B]; f++) {
      const a = ahead(m);
      if (a >= 0 && a <= 24 && !m[0x23]) tries.push({ at: f, ahead: a, fine: m[0x1B], cleared: attempt(m.slice(), rnd, DEADLY).cleared });
      run.step({});
    }
    return { start, deadly: DEADLY, tries };
  }
  function attempt(m, rnd, DEADLY, frames) {
    const run = Run(m, rnd);
    const gone = () => { const l = texColumn(m); for (let c = l; c < 40; c++) if (DEADLY[m[0x0F70 + c]]) return false; return true; };
    run.step({ up: 1 });
    if (frames) frames.push(run.shown.slice());
    for (let f = 0; f < 400; f++) {
      if (m[0x7B]) return { cleared: false, frames };
      if (!m[0x23] && gone()) return { cleared: true, frames };
      run.step({});
      if (frames) frames.push(run.shown.slice());
    }
    return { cleared: false, frames };
  }
  function tryJump(start, at, rnd = () => 0) {
    const m = start.slice(), run = Run(m, rnd), frames = [];
    for (let f = 0; f < at; f++) { run.step({}); if (f >= at - 12) frames.push(run.shown.slice()); }
    const r = attempt(m, rnd, deadly(m), frames);
    for (let f = 0; f < 16; f++) { run.step({}); frames.push(run.shown.slice()); }
    return r;
  }

  function sound(L, name, o = {}, rnd = byte) {
    const m = fresh(L, rnd), log = [];
    let base = 0;
    const c = cpuFor(m, rnd, { log, now: cpu => base + cpu.cycles - cpu.from });
    const at = (frame, cycle) => { base = frame * FRAME + cycle; c.from = c.cycles; };
    // TED's sound as play leaves it: both voices off at volume 0; SOUND ON at the menu
    m[0xFF11] = 0; m[0xFF10] = 0; m[0xFF12] = 0xC0; m[0x1828] = 1;
    for (const a of [0xDA, 0xDB]) m[a] = 0;
    // tick_sounds once a frame, from irq_scroller at line 192, 22,471 cycles into the frame in plus4emu
    const meant = o.meant ? { 0x3672: cpu => { cpu.wr(0xFF12, (m[0xFF12] & 0xFC) | (m[0xDC] & 3)); cpu.pc = 0x367A; } } : {};
    const tick = f => { at(f, 22471); c.call(R.tickSounds, {}, { hooks: meant }); };
    let f = 0;
    if (name === 'shot' || name === 'hit') {
      // fire_bullet calls shot_sound from irq_field, 8,301 cycles in; move_bullet calls hit_sound from
      // irq_frame, after that frame's tick, 26,496 cycles in
      if (name === 'shot') { at(0, 8301); c.call(R.shotSound); }
      else { tick(0); at(0, 26496); c.call(R.hitSound); f = 1; }
      for (; f < 30; f++) tick(f);
    } else if (name === 'count') {
      // level_complete's loop: a point, an eighth of pressure, the tone, delay with X = 8. Each pass
      // took 42,290 cycles on average in plus4emu (39,068 to 47,517: the interrupts' work varies),
      // which is what each delay is counted as here
      m[0x29] = o.cells === undefined ? 25 : o.cells; m[0x28] = o.fine === undefined ? 7 : o.fine; m[0x6F] = 0;
      let pass = 0;
      at(0, 10135);
      c.pc = R.count[0];
      c.run({ until: R.count[1], maxSteps: 1e6, hooks: { [R.delay]: cpu => { at(0, 10135 + ++pass * 42290); cpu.rts(); } } });
      // $3942: the sound off, then the pause of six delays before next_level
      c.wr(0xFF11, 0);
      f = Math.ceil(base / FRAME);
    }
    return { format: 'kit-c16-sound', clock: CLOCK, frame: FRAME, start: 0, end: (f + 10) * FRAME, writes: log };
  }

  return { FRAME, R, fresh, startLevel, Run, bands, picture, draw, nextLevel, sound, cpuFor, bcd, deadly, jumps, tryJump };
})();
