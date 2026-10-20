/* pete.js */
// Prospector Pete's pages run the game's own routines on the kit's 6502 (C64Cpu, from
// ../../lib/cpu6502.js, with the C16's 16 KB of RAM repeating through the 64 KB, { ramSize: 0x4000 },
// and TED's registers at $FF00 plain bytes) over the memory the listing records (C16.load), and draw
// the map with the site's TED screen (C16.render).
// index.html, discoveries.html and levels.html load it after those two. test_pete.js beside the
// pages holds it to the listing; the traces in work/ hold it to the game running in plus4emu.
//
//   Pete.fresh(L) -> m                a copy of the listing's memory to run the game in
//   Pete.table(m, name, k)            level k's byte (0 to 15) of a level table, by name (TABLES)
//   Pete.startLevel(m, k, rnd)        start_level ($1C54) for level k, up to $1E0A where it turns the
//                                     interrupt on, then what it does after its wait ($1E33-$1E3E):
//                                     the mine rolled, Pete at the top of the shaft, the big charge lit
//   Pete.Mine(m, rnd) -> mine         the level frame by frame, with Pete's digging, the dynamite and
//                                     the water as the game runs them, and nothing else: no creatures,
//                                     no goodies collected, no deaths. mine.step({x, y, fire}) runs
//                                     one frame with the joystick held so (x, y: -1, 0 or 1)
//   Pete.drawMap(canvas, m, opts)     the map, 90 columns by 23 rows, as TED draws its characters:
//                                     opts.day (0 to 15) for the surface's colours, opts.marks
//                                     [{col, row, ch}] characters put over the map for the picture only,
//                                     opts.s the scale, opts.rows [first, last]
//   Pete.grid(canvas, m, cols, rows, cell, sky, opts)   any cells so: cell(col, row) the character,
//                                     sky(row) true for a row in the surface's colours
//   Pete.withFigures(m, fn)           fn() with Pete and the creatures drawn into the map, as irq_play
//                                     draws them for the view ($1A57-$1A60)
//   Pete.frame(m, opts) -> picture    the play screen in m as TED draws it in irq_play's three bands
//   Pete.heads(m, at, pete, meant)    the way move_creatures ($2778) sends a creature standing at the
//                                     end of a cell, at = {col, row, dir}, with every way round it open
//                                     and Pete at pete = {col, row}: 'wander' when it does not chase,
//                                     else the way it goes when it chases up or down first. meant reads
//                                     the creature's row at $27A6, where the game reads its column
//
// rnd(address, pc) gives the byte that the instruction at pc reads from TED's register at address:
// the timers, the raster and the beam's position, which the game reads as random numbers. The
// default is Math.random's.
globalThis.Pete = (function () {
  const MAP = 0x37EA, COLS = 90, ROWS = 23;
  const TABLES = { sticks: 0x1EC9, release: 0x1ED9, water: 0x1EE9, day: 0x1EF9, night: 0x1F09, creatures: 0x1F19,
    small: 0x1F29, wide: 0x1F39, tall: 0x1F49, large: 0x1F59, fuse: 0x1F69, bigFuse: 0x1F79 };
  const SKY = [0x1AFD, 0x1B0D, 0x1B1D], MINE = [0x00, 0x41, 0x39];   // irq_play's two sets of colours
  const R = { startLevel: 0x1C54, built: 0x1E0A, movePete: 0x1F89, dynamite: 0x2B93, bigCharge: 0x1977,
    waterStep: 0x23F3, moveCreatures: 0x2778 };
  // The instructions that read TED's timers, raster and beam, by the register each reads: random_below
  // and find_space (the mine), and move_creatures (the creatures' choice).
  const READS = {
    0x2D1E: 0xFF1E, 0x2D21: 0xFF00, 0x2D26: 0xFF00, 0x2D2D: 0xFF1D, 0x2D32: 0xFF02, 0x2D4B: 0xFF00, 0x2D4E: 0xFF02,
    0x27E6: 0xFF00, 0x27E9: 0xFF02, 0x27F2: 0xFF1E, 0x27F5: 0xFF00, 0x2815: 0xFF1E, 0x2818: 0xFF00, 0x281B: 0xFF1D };
  const byte = () => Math.random() * 256 | 0;
  const at = (col, row) => MAP + row * COLS + col;

  // The listing is the game as the loader hands it over, before start ($1800) has run build_figures
  // ($2236), which shifts the moving figures' frames into $0400-$06FF once at start-up.
  function fresh(L) { const m = L.ram.slice(); cpuFor(m).call(0x2236); return m; }
  function table(m, name, k) { return m[TABLES[name] + k]; }
  function hooks(m, rnd, more) {
    const h = Object.assign({}, more);
    for (const pc in READS) {
      const was = h[pc];
      h[pc] = cpu => { m[READS[pc]] = rnd(READS[pc], +pc) & 255; return was ? was(cpu) : undefined; };
    }
    return h;
  }
  // On a C16 the 16 KB of RAM repeats through the 64 KB: find_space's check for room round a goodie
  // in row 21 reads row 23 below the map, at $4000, which is the zero page again
  function cpuFor(m) { const c = new C64Cpu.CPU(m, { ramSize: 0x4000 }); c.sp = 0xFF; return c; }
  function startLevel(m, k, rnd = byte) {
    m[0xA7] = k;
    const c = cpuFor(m);
    c.pc = R.startLevel;
    c.run({ until: R.built, hooks: hooks(m, rnd) });
    // $1E33-$1E3E: once the interrupt has counted down two seconds, the release count is set, the
    // level is on, and the big charge is laid in the bottom of the shaft
    m[0x7B] = m[0x7C]; m[0xA8] = m[0x7C];
    m[0x3F78] = 0x6F; m[0xC3] = 0x6F;
    return m;
  }

  function Mine(m, rnd = byte) {
    const c = cpuFor(m), h = hooks(m, rnd);
    const call = a => c.call(a, {}, { hooks: h });
    let frame = 0;
    // A frame as plus4emu counts them, from its start: main_loop's pass for it (but in the first,
    // the rest of the frame in which start_level returned), then irq_play's lines $1A and $AC.
    return {
      m, get frame() { return frame },
      step(input = {}) {
        if (frame++) {
          // irq_play at line 0 ($19A1-$19AF): the frame count, and a step of the day every 256 frames
          m[0x64] = (m[0x64] + 1) & 255;
          if (!m[0x64] && m[0xA8]) m[0xA0] = (m[0xA0] + 1) & 15;
          // ($19ED-$19FD) every fourth frame the fuse's two top rows trade places
          if ((m[0x64] & 3) === 3) { m[0x1379] = m[0x1378]; m[0x1378] ^= 0x3C; }
          // ($19CC-$19E7) the explosion's character, $A2, filled with random bits every frame
          for (let i = 0; i < 7; i++) m[0x1510 + i] = rnd(0xFF01, 0x19CE) & m[0x1511 + i];
          m[0x1517] = rnd(0xFF00, 0x19DF);
          // main_loop, once the frame count has moved ($186F, $1875): the dynamite, and the big charge
          call(R.dynamite);
          call(R.bigCharge);
        }
        // at line $1A, read_controls ($20A7): the stick into $09 and $0A, fire into $0B, the last into $0C
        m[0xA6] = m[0x09]; m[0x09] = (input.x || 0) & 255; m[0x0A] = (input.y || 0) & 255;
        m[0x0C] = m[0x0B]; m[0x0B] = input.fire ? 8 : 0;
        // at line $AC ($1A63-$1AE9): Pete every other frame (every frame from level 10), and once the
        // flood has begun the water every $7F frames
        if (m[0xA8]) {
          if (m[0xBB] === 0) {
            if (!m[0x83]) { call(R.movePete); m[0xBB] = m[0xA7] >= 9 ? 0 : 1; }
          } else m[0xBB]--;
          if (m[0x6A]) {
            if (m[0x80] === 0) { call(R.waterStep); m[0x80] = m[0x7F]; }
            m[0x80]--;
          }
        }
        return this;
      },
      pete() { return { col: m[0x06], row: m[0x07], moving: m[0x4A] } },
    };
  }

  // TED as the game sets it in play, with the window drawn from the top of the screen: 25 rows, no
  // scroll, 40 columns, multicolour, 256 characters from $1000, the screen at $0800.
  const TED = [];
  TED[0x06] = 0x1B; TED[0x07] = 0x98; TED[0x12] = 0xC8; TED[0x13] = 0x11; TED[0x14] = 0x0F;
  TED[0x15] = 0; TED[0x16] = 0; TED[0x17] = 0; TED[0x19] = 0;
  let video;
  // Cells of the game's characters drawn as TED draws them, in 40-column slices, each slice drawn
  // twice by C16.render, in the surface's colours and in the mine's, as irq_play changes them down
  // the screen: cell(col, row) gives the character, and sky(row) whether the row is the surface's.
  function grid(canvas, m, cols, rows, cell, sky, o = {}) {
    const day = (o.day || 0) & 15, s = o.s || 1, W = cols * 8, H = rows * 8, px = new Uint8Array(W * H);
    const v = video || (video = new Uint8Array(0x10000));
    v.set(m.subarray(0x1000, 0x1800), 0x1000);
    const up = TED.slice(), down = TED.slice();
    [up[0x15], up[0x16], up[0x17]] = SKY.map(a => m[a + day]);
    [down[0x15], down[0x16], down[0x17]] = MINE;
    for (let c0 = 0; c0 < cols; c0 += 40) {
      for (let r = 0; r < Math.min(rows, 25); r++) for (let c = 0; c < 40; c++) {
        v[0x0C00 + r * 40 + c] = c0 + c < cols ? cell(c0 + c, r) : 0;
        v[0x0800 + r * 40 + c] = sky(r) ? 0x79 : 0x7E;            // start_level's colours ($1D6F, $1D25)
      }
      const a = C16.render(v, up), b = C16.render(v, down), w = Math.min(40, cols - c0) * 8;
      for (let y = 0; y < H; y++) px.set((sky(y >> 3) ? a : b).px.subarray(y * 320, y * 320 + w), y * W + c0 * 8);
    }
    const pic = { w: W, h: H, px };
    if (canvas.width !== W * s || canvas.height !== H * s) { canvas.width = W * s; canvas.height = H * s; }
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d'), img = new ImageData(C16.rgba(pic), W, H);
    if (s === 1) ctx.putImageData(img, 0, 0);
    else {
      const t = grid.tmp || (grid.tmp = document.createElement('canvas'));
      t.width = W; t.height = H; t.getContext('2d').putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(t, 0, 0, W * s, H * s);
    }
    return pic;
  }
  function drawMap(canvas, m, o = {}) {
    const [r0, r1] = o.rows || [0, ROWS - 1];
    const marks = new Map((o.marks || []).map(k => [k.row * COLS + k.col, k.ch]));
    return grid(canvas, m, COLS, r1 - r0 + 1, (c, r) => {
      const i = (r0 + r) * COLS + c;
      return marks.has(i) ? marks.get(i) : m[MAP + i];
    }, r => r0 + r < 3, o);
  }

  // irq_play's drawing of the figures ($1A57-$1A60): stamp_figures puts their characters into the
  // map, draw_figures builds them, fn draws, and unstamp_figures puts the map back.
  function withFigures(m, fn) {
    const c = cpuFor(m);
    c.call(0x270A); c.call(0x262C);
    try { return fn(); } finally { c.call(0x274C); }
  }

  // The play screen as TED draws it from m's screen ($0800 colours, $0C00 characters) and character
  // set, in irq_play's three bands (frame_check in work/ holds it to plus4emu's picture): from line 0
  // the scroll in $03 and the surface's colours for the step of the day; from line $1A (the window's
  // fourth row) the mine's colours; from line $BA (its 24th) 40 columns and no scroll. opts.day and
  // opts.scroll stand in for $A0 and $03; opts.one draws the whole window with the last band's
  // registers, as one read of TED at the end of the frame would.
  function frame(m, o = {}) {
    const day = (o.day === undefined ? m[0xA0] : o.day) & 15, scroll = o.scroll === undefined ? m[0x03] : o.scroll;
    const t = (ff07, colours) => { const r = TED.slice(); r[0x07] = ff07; [r[0x15], r[0x16], r[0x17]] = colours; return r; };
    const bands = o.one ? [[0, 200, t(0x98, MINE)]]
      : [[0, 24, t(scroll, SKY.map(a => m[a + day]))], [24, 184, t(scroll, MINE)], [184, 200, t(0x98, MINE)]];
    const px = new Uint8Array(320 * 200);
    for (const [y0, y1, ted] of bands) px.set(C16.render(m, ted).px.subarray(y0 * 320, y1 * 320), y0 * 320);
    return { w: 320, h: 200, px };
  }

  // move_creatures for creature 0, at the end of a cell ($28 = 3) in a mine of open tunnel. The
  // reads of TED are fixed so that it chases (the low three bits of $FF00 EOR $FF02 below 5, at
  // $27E6) and tries up or down first (bit 0 of $FF1E EOR $FF00 set, at $27F2). A creature that
  // never reaches $27E6 wanders: the two differences ANDed together are 0 ($27E0).
  const WAYS = ['', 'up', 'down', 'left', 'right'];
  function heads(m, at_, pete, meant) {
    for (let a = MAP + 3 * COLS; a < MAP + ROWS * COLS; a++) m[a] = 0;
    m[0x27A7] = meant ? 0x8E : 0x8A;
    m[0x06] = pete.col; m[0x07] = pete.row;
    for (let n = 0; n < 4; n++) m[0x23 + n] = 0;
    const cell = at(at_.col, at_.row);
    m[0x23] = 1; m[0x28] = 3; m[0x30] = cell & 255; m[0x31] = cell >> 8; m[0x32] = m[0x30]; m[0x33] = m[0x31];
    m[0x4B] = at_.dir; m[0x8A] = at_.col; m[0x8E] = at_.row;
    let chased = false;
    const fixed = { 0xFF00: 0, 0xFF02: 0, 0xFF1E: 1, 0xFF1D: 0 };
    const c = cpuFor(m);
    c.call(R.moveCreatures, { c: 1 }, { maxSteps: 20000, hooks: hooks(m, a => fixed[a], { 0x27E6: () => { chased = true; } }) });
    m[0x27A7] = 0x8A;
    return chased ? WAYS[m[0x4B]] : 'wander';
  }

  return { MAP, COLS, ROWS, TABLES, SKY, MINE, READS, R, at, fresh, table, startLevel, Mine, grid, drawMap, withFigures, frame, heads, TED };
})();
