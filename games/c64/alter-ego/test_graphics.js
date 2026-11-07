'use strict';
// The Graphics tab (graphics.html) on a clean checkout: its two moving things, the arrow and the
// curtain, moved by the port's routines the page carries, against the game's own code doing the
// same in the kit's 6502 on the listing's memory.
// - the page's copies of the port (port/src/core.js, natives.js, ui.js, time.js) are the Play
//   page's, its stages the Stages tab's and its glyphs the Play page's;
// - the arrow: from where Infancy starts, sent to every place of its map's first window in turn,
//   each interrupt of the port's sprite0_motion_irq_hook against the game's interrupt handler
//   ($4229) run to its jump into the KERNAL (through $4194): the arrow's place and target ($418E-$4193)
//   and the sprite's registers ($D000, $D001, $D010) the same after every one;
// - the curtain: the age page brought on over Infancy's map and taken off again, by the port's
//   animate_screen_region_transition and by the game's ($44C5), called from a p-code program of
//   the game's interpreter: the bitmap, the screen's colours and the sprites' registers the same
//   when each has finished.
//   node games/c64/alter-ego/test_graphics.js
const path = require('path');
const { game, differ } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;
const PAGE = 'graphics.html', page = g.read(PAGE);
for (const b of ['port/src/core.js', 'port/src/natives.js', 'port/src/ui.js', 'port/src/time.js']) { g.sameBlock(b); g.run(PAGE, b, 'AEPort'); }
const { AEPort } = globalThis;
g.lib('cpu6502');
const { CPU } = globalThis.C64Cpu;
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const json = (html, id) => JSON.parse(new RegExp('<script type="application/json" id="' + id + '">([^<]*)</script>').exec(html)[1]);
const STAGES = json(page, 'ae-stages'), GLYPHS = json(page, 'ae-glyphs');
if (JSON.stringify(STAGES) !== JSON.stringify(json(g.read('levels.html'), 'ae-stages'))) fail('the page\'s stages are not the Stages tab\'s');
if (GLYPHS !== json(g.read('play.html'), 'ae-data').glyphs) fail('the page\'s glyphs are not the Play page\'s');
if (!fails) console.log('ok   the page\'s stages and glyphs are the other pages\'');

// the page's machine: the listing's memory with the life program's over $8466, Infancy's choices
// ($81C5) and map ($81F7) put in, the chips' registers kept
const main = g.listing('parts/main/listing.json'), life = g.listing('parts/life/listing.json');
const s = STAGES[0];
function memory() {
  const M = main.ram.slice();
  for (let a = 0x8466; a < 0x10000; a++) if (life.has[a]) M[a] = life.ram[a];
  s.choices.forEach((v, i) => { M[0x81C5 + 2 * i] = v & 255; M[0x81C6 + 2 * i] = v >> 8; });
  s.grid.forEach((v, i) => { M[0x81F7 + 2 * i] = v & 255; M[0x81F8 + 2 * i] = v >> 8; });
  return M;
}
const chips = () => { const regs = new Uint8Array(0x400); return { regs, read: a => (a === 0xD012 ? 0 : regs[a & 0x3FF]), write: (a, v) => { regs[a & 0x3FF] = v; } }; };
function port() {
  const M = memory(), io = chips();
  const P = AEPort.create(M, io, { cpuPort: 0x35, cpuDir: 0x2F, charRom: Uint8Array.from(Buffer.from(GLYPHS, 'base64')) });
  P.sp = P.fp = 0xCE00;
  P.initialize_display_and_sprite_irq(22);
  P.wb(0xD027, 0);
  let at = (s.grid.length / 3 - 1) * 3 + 2;
  while (at > 0 && !(s.grid[at] & 0x0F00)) at--;
  const top = Math.floor(at / 3);
  P.render_initial_life_map_window(top);
  return { M, io, P, top };
}
const cpuOn = (M, io) => { const c = new CPU(M, { port: { dir: 0x2F, data: 0x35 }, io }); c.sp = 0xF0; return c; };
const copy = io => { const o = chips(); o.regs.set(io.regs); return o; };

// ---- the arrow
{
  const A = port(), B = { M: A.M.slice(), io: copy(A.io) };
  const colX = c => A.M[0x7F36 + 2 * c] | A.M[0x7F37 + 2 * c] << 8;
  const rowY = j => (A.M[0x82C1 + 2 * j] | A.M[0x82C2 + 2 * j] << 8) + 53;
  const sa = Math.floor(s.start / 3) - (A.top - 3), sc = s.start % 3 + 1;
  A.P.sprite0_show_at_position(colX(sc), rowY(sa));
  A.P.enable_sprite0();
  const state = (M, io) => [0x418E, 0x418F, 0x4190, 0x4191, 0x4192, 0x4193].map(a => M[a]).concat([io.regs[0], io.regs[1], io.regs[0x10]]);
  let ticks = 0;
  outer: for (let j = 0; j < 4; j++) for (let c = 0; c < 5; c++) {
    A.P.sprite0_set_target(colX(c), rowY(j));
    for (let n = 0; n < 200 && !A.P.sprite0_has_reached_target(); n++) {
      B.M.set(A.M.subarray(0x418E, 0x4194), 0x418E);   // the same place and target before each
      B.io.regs.set(A.io.regs.subarray(0, 0x30));
      A.P.sprite0_motion_irq_hook();
      // the handler leaves through the KERNAL's interrupt, by the vector it saved ($4194): here
      // to the interpreter's BRK at $7893, where the run stops
      B.M[0x4194] = 0x93; B.M[0x4195] = 0x78;
      const cpu = cpuOn(B.M, B.io);
      cpu.pc = 0x4229;
      cpu.run({ until: 0x7893, cycles: 1e5 });
      if (cpu.pc !== 0x7893) { fail('the game\'s interrupt did not reach its jump into the KERNAL'); break outer; }
      const p = state(A.M, A.io), w = state(B.M, B.io), d = p.findIndex((v, i) => v !== w[i]);
      if (d >= 0) { fail('the arrow sent to column ' + c + ', row ' + j + ', interrupt ' + n + ': [' + p + '] on the page, [' + w + '] in the game'); break outer; }
      ticks++;
    }
  }
  if (!fails) console.log('ok   ' + ticks + ' interrupts of the arrow moved as the game moves it');
}

// ---- the curtain
{
  const A = port(), P = A.P, PANEL = 0x0800, buf = 0xCF00;
  A.M[0x7F74] = 3; A.M[0x7F75] = 0; A.M[0x7FC5] = 128;      // three years and a half
  P.clear_and_frame_text_region(23, PANEL);
  P.render_text_into_region(0xAB7E, PANEL, 9, 11, 2);
  P.render_text_into_region(0xAB88, PANEL, 17, 7, 6);
  P.format_word_as_three_decimal_digits(P.rw(0x7F74), buf);
  for (const at of [buf, buf + 1]) if (P.rb(at) === 48) P.wb(at, 32); else break;
  P.render_text_into_region(buf, PANEL, 3, 9, 8);
  P.format_word_as_three_decimal_digits(P.return_argument_byte_1(P.mul(P.return_argument_byte_1(P.rw(0x7FC4)), 12)), buf);
  for (const at of [buf, buf + 1]) if (P.rb(at) === 48) P.wb(at, 32); else break;
  P.render_text_into_region(buf, PANEL, 3, 18, 8);
  P.render_text_into_region(0xAB9A, PANEL, 14, 8, 21);
  P.disable_sprite0();
  const B = { M: A.M.slice(), io: copy(A.io) };
  for (const [on, fill, steps] of [[true, 24, 1], [false, 22, 8]]) {
    const args = [4, 1, 23, PANEL, fill, steps];
    const run = P.animate_screen_region_transition(...args);
    let frames = 0;
    while (!run.next().done) if (++frames > 1e5) { fail('the port\'s curtain did not end'); break; }
    const prog = [];
    for (const v of args.slice().reverse()) prog.push(0x8E, v & 255, v >> 8);
    prog.push(0xAC, 0xC5, 0x44, 0x80);
    B.M.set(prog, 0x0200);
    B.M[0x04] = 0x00; B.M[0x05] = 0xCF; B.M[0x06] = 0x00; B.M[0x07] = 0xCF; B.M[0x08] = 0x00; B.M[0x09] = 0x02;
    const cpu = cpuOn(B.M, B.io);
    cpu.pc = 0x713C; cpu.sp = 0xFF;
    cpu.run({ until: 0x7893, cycles: 5e7 });
    if (cpu.pc !== 0x7893) { fail('the game\'s curtain did not return'); break; }
    const name = on ? 'bringing on the age' : 'taking it off';
    for (const [lo, hi, what] of [[0x2000, 0x3F3F, 'the bitmap'], [0x0400, 0x07E7, 'the screen\'s colours'], [PANEL, PANEL + 23 * 320 - 1, 'the panel']]) {
      const d = differ(A.M.subarray(lo, hi + 1), B.M.subarray(lo, hi + 1), [[0, hi - lo + 1]]);
      if (d >= 0) fail(name + ': ' + what + ' differ at $' + (lo + d).toString(16) + ': ' + A.M[lo + d] + ' on the page, ' + B.M[lo + d] + ' in the game');
    }
    const r = A.io.regs.subarray(0, 0x2F), w = B.io.regs.subarray(0, 0x2F), d = r.findIndex((v, i) => v !== w[i]);
    if (d >= 0) fail(name + ': the video chip\'s $D0' + d.toString(16).padStart(2, '0') + ' is ' + r[d] + ' on the page, ' + w[d] + ' in the game');
    if (!fails) console.log('ok   the curtain ' + name + ' as the game does it, in ' + frames + ' frames');
  }
}
console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
