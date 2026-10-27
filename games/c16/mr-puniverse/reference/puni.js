/* puni.js */
// Mr Puniverse's pages run the game's own routines on the kit's 6502 (C64Cpu, from
// ../../lib/cpu6502.js) over the memory the listing records (C16.load), with the C16's 16 KB of RAM
// repeating through the 64 KB ({ ramSize: 0x4000 }) and TED served by the site's model of it,
// C16.io: its registers read back as written, the joystick in port 2 from what the page holds, and
// every write to the sound registers into a log. Pictures are drawn with the site's TED screen,
// C16.renderBands. index.html, discoveries.html and levels.html load it after those two;
// test_puni.js beside the pages holds it to the listing and to plus4emu's picture and sound.
//
//   Puni.fresh(L) -> m          the listing's memory with the bytes the KERNAL leaves below the game
//                               as the tape hands over (Puni.KERNAL_RAM), run from entry ($1AF4) to
//                               the title's first call of title_dot_step ($3225): setup_machine has
//                               set TED up, and new_game has cleared the players and drawn the title
//   Puni.start(m, o) -> m       start_turn ($328F) to the first pass of main_loop ($32BC), in a game
//                               as F1 starts it (one player, the joystick, 8 lives): GET READY, the EGY
//                               bar refilled, the room drawn and Mr Puniverse in it. o.room, the room
//                               (default 0); o.at, his block's screen address (default
//                               setup_machine's, $0C52: row 2, column 2)
//   Puni.room(m, r) -> m        room r as room_start draws it, without him: clear_play_area and
//                               draw_room ($2868), which makes its objects
//   Puni.Room(m, rnd) -> run    the room's objects as main_loop moves them, without him: run.pass()
//                               runs animate_chars, rotate_vitamin_chars and update_objects once.
//                               rnd() gives the bit the random cannon reads from $FF1F
//   Puni.bands(m) -> bands      the frame's two bands for C16.renderBands: the window's lines 0 to
//                               143 in the room's three colours ($0339-$033B) and 144 to 199 in the
//                               panel's ($06, $77, $F0), as irq sets them at lines 250 and 146
//   Puni.picture(m, o) -> pic   { w: 320, h: 200, px }, drawn so; o.one, with the panel's colours
//                               all the way down, as one read of TED's registers would draw it
//   Puni.draw(canvas, pic, s)   a picture onto a canvas, s times its size
//   Puni.tune(L, o) -> log      the title tune in the kit-c16-sound format of site/lib/ted-sound.js:
//                               music_tick ($1AF7) run once a frame from the counters setup_machine
//                               leaves, as irq calls it at line 250, for o.frames frames (default
//                               774: six of step 255, then the 128 steps). o.old: old_music_tick
//                               ($317F), which nothing calls, on what lies in its tables
//   Puni.solid(m) -> flags      is_solid ($22E6) on each of the 256 characters: 1 where it stops him
//   Puni.cpuFor(m, o)           the 6502 over m: o.log and o.now for the sound, o.rnd for $FF1F
globalThis.Puni = (function () {
  const FRAME = 35568, CLOCK = 1773447, LINE = 114;
  const R = { entry: 0x1AF4, title: 0x3225, startTurn: 0x328F, roomStart: 0x32A5, mainLoop: 0x32BC,
    clearPlayArea: 0x1FD2, drawRoom: 0x2868, animateChars: 0x1D13, rotateVitamin: 0x2844,
    updateObjects: 0x2A97, musicTick: 0x1AF7, oldMusicTick: 0x317F, isSolid: 0x22E6, scnkey: 0xFF9F };
  const T = { lives: 0x0345, room: 0x0347, active: 0x0349, player: 0x034B, keyboard: 0x034D,
    savedLo: 0x0341, savedHi: 0x0343, roomColours: 0x0339, musicOn: 0x0385, oldFlag: 0x03BB };
  // The bytes of RAM below the game that the KERNAL and the tape leave as the tape's BASIC line
  // hands over: the key code and the keyboard's table pointer, its state and its vector at $0545,
  // the function keys' lengths, two flags of the screen editor's, and in the tape buffer the
  // title's three colours ($0339-$033B) and $034B (port/src/core.js, KERNAL_RAM)
  const KERNAL_RAM = [
    [0x00C6, [0x40]], [0x00EC, [0x00, 0x00, 0xFF, 0x00, 0x00]],
    [0x0339, [0x4C, 0x4A, 0xF0]], [0x034B, [0xA1]],
    [0x053F, [0x0A, 0x80, 0x04, 0x0A, 0x00, 0x00, 0x7A, 0xDB, 0x00]],
    [0x055F, [0x07, 0x06, 0x0A, 0x07, 0x06, 0x04, 0x05, 0x05]],
    [0x07F6, [0x40, 0x00]],
  ];
  // TED as the KERNAL leaves it: 25 rows, 40 columns, the screen at $0800, the ROM's characters
  const KERNAL_TED = { 0x06: 0x1B, 0x07: 0x08, 0x12: 0xC4, 0x13: 0xD0, 0x14: 0x08 };
  const PANEL = [0x06, 0x77, 0xF0], SPLIT = 144;

  function cpuFor(m, o = {}) {
    let c;
    const io = C16.io(m, { log: o.log, now: o.now && (() => o.now(c)),
      read: a => (a === 0xFF1F && o.rnd ? (m[0xFF1F] & 0xF8) | (o.rnd() & 7) : undefined) });
    c = new C64Cpu.CPU(m, { ramSize: 0x4000, ioPages: [0xFD, 0xFF], io });
    c.io = io;
    c.sp = 0xF6;
    return c;
  }

  function fresh(L) {
    const m = L.ram.slice();
    for (const [a, bytes] of KERNAL_RAM) m.set(bytes, a);
    for (const r in KERNAL_TED) m[0xFF00 + +r] = KERNAL_TED[r];
    const c = cpuFor(m);
    c.pc = R.entry;
    c.run({ until: R.title, maxSteps: 2e6 });
    return m;
  }

  function start(m, o = {}) {
    m[T.active] = 1; m[T.lives] = 8;
    if (o.players === 2) { m[T.active + 1] = 1; m[T.lives + 1] = 8; }
    if (o.keyboard) m[T.keyboard] = 1;
    m[T.player] = 0; m[T.room] = o.room || 0;
    if (o.at) { m[T.savedLo] = o.at & 0xFF; m[T.savedHi] = o.at >> 8; }
    const c = cpuFor(m);
    c.pc = R.startTurn;
    c.run({ until: R.mainLoop, maxSteps: 5e6 });
    return m;
  }

  function room(m, r) {
    m[T.player] = 0; m[T.room] = r;
    const c = cpuFor(m);
    c.call(R.clearPlayArea);
    c.call(R.drawRoom, {}, { maxSteps: 2e6 });
    return m;
  }

  function Room(m, rnd = () => Math.random() * 8 | 0) {
    const c = cpuFor(m, { rnd });
    let n = 0;
    return {
      m, get passes() { return n },
      pass() {
        c.call(R.animateChars); c.call(R.rotateVitamin); c.call(R.updateObjects, {}, { maxSteps: 1e6 });
        n++;
        return this;
      },
    };
  }

  function bands(m) {
    const ted = [...m.subarray(0xFF00, 0xFF20)];
    const top = ted.slice(), low = ted.slice();
    [0x15, 0x16, 0x17].forEach((r, i) => { top[r] = m[T.roomColours + i]; low[r] = PANEL[i]; });
    return [{ y0: 0, y1: SPLIT - 1, mem: m, ted: top }, { y0: SPLIT, y1: 199, mem: m, ted: low }];
  }
  function picture(m, o = {}) {
    const b = bands(m);
    if (o.one) return C16.renderBands([{ y0: 0, y1: 199, mem: m, ted: b[1].ted }], { size: 0x4000 });
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

  function tune(L, o = {}) {
    const m = fresh(L), log = [];
    let base = 0;
    const c = cpuFor(m, { log, now: cpu => base + cpu.cycles - cpu.from });
    const frames = o.frames || (o.old ? 7 * 96 + 7 : 774);
    // TED's sound as the title leaves it: setup_machine's volume 15, both voices off
    m[0xFF11] = 0x0F;
    if (o.old) { m[T.oldFlag] = 0; m[0xD0] = 0xFF; m[0xD1] = 0xFF; }
    for (let f = 0; f < frames; f++) {
      base = f * FRAME + 250 * LINE; c.from = c.cycles;
      c.call(o.old ? R.oldMusicTick : R.musicTick);
    }
    return { format: 'kit-c16-sound', clock: CLOCK, frame: FRAME, start: 0, end: frames * FRAME, writes: log };
  }

  // A room's record, read as draw_room ($2868) and draw_room_objects ($2999) read it
  const OBJ_LEN = { 1: 5, 2: 6, 3: 6, 4: 6, 5: 8, 7: 6, 8: 4 };
  const OBJ_NAME = { 1: 'bridge', 2: 'force field', 3: 'cannon', 4: 'random cannon', 5: 'crusher', 7: 'scenery', 8: 'switch' };
  function record(ram, r) {
    const at = ram[0x1090 + r] | ram[0x10AE + r] << 8, b = i => ram[at + i];
    const o = { room: r, at, exits: [b(0), b(1), b(2), b(3)], vitamin: { id: b(4), addr: b(5) | b(6) << 8, colour: b(7) },
      wall: b(8), colour: b(9), bg: [b(10), b(11), b(12)], top: b(13), walls: [...ram.subarray(at + 14, at + 59)], objects: [] };
    let i = 59;
    while (b(i) !== 0xFF) {
      const type = b(i) & 15, n = OBJ_LEN[type];
      if (!n) throw new Error('room ' + r + ': object type ' + type + ' at $' + (at + i).toString(16));
      o.objects.push({ type, name: OBJ_NAME[type], at: at + i, addr: (b(i) >> 4) << 8 | b(i + 1), bytes: [...ram.subarray(at + i, at + i + n)] });
      i += n;
    }
    o.rate = b(i + 1); o.drains = b(i + 2) === 1; o.length = i + 3;
    return o;
  }

  function solid(m) {
    const s = m.slice(), c = cpuFor(s), out = new Uint8Array(256);
    for (let ch = 0; ch < 256; ch++) { c.call(R.isSolid, { a: ch }); out[ch] = c.c ? 1 : 0; }
    return out;
  }

  return { FRAME, CLOCK, R, T, KERNAL_RAM, SPLIT, PANEL, OBJ_NAME, cpuFor, fresh, start, room, Room, bands, picture, draw, tune, record, solid };
})();
