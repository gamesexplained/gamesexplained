#!/usr/bin/env node
// Hold the Maps / levels page's course drive against the game's own code. levels.html's pd-course
// block (createCourse) sets a stage up and runs its race frames on the site's 6502 with the kart
// held in the middle of the road at a set speed level. Here the game runs its own path on the
// kit's simulator over the whole listing: stage_loop from setup_stage to copy_colours ($086F-$08A1),
// then race_frame_loop ($08AC-$08F4) once a race frame, with only these stand-ins: the screens
// before a race leave the colour buffer at 8 (clear_text_screen, run first), wait_frame returns at
// once, the kart is put in the middle of the road ($2F = $E0) after stage_loop's track_step, and
// move_player sets the speed level and the middle of the road and goes on into its own move_on.
// Everything else runs: the rivals, the places, the panel. After every frame both must hold the
// same view: the two view screens, the race's character set (the stage copies blocks of shapes
// into it), colour RAM's rows 5 to 24, which screen is shown, and the line and colours of the sky
// and the ground. That is checked for a whole lap of every stage at level 32, and of the first
// stage with a jump at level 10, the slowest the page offers. The page's viewPixels is checked
// against the site's model of the video chip (C64.renderFrame) on frames of each stage, given the
// registers race_irq_top and race_irq_view set and the sky and ground's change of colour where
// viewPixels puts it. It exits 1 on any difference.
//   node games/c64/power-drift/test_course.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createCourse, viewPixels, PD_COURSE } = g.run('levels.html', 'pd-course', 'createCourse', 'viewPixels', 'PD_COURSE');
g.lib('c64');
const { C64 } = globalThis;
const L = g.listing();
let bad = 0, frames = 0, drawn = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

function theGame(course, stage, level) {
  const m = L.ram.slice(), colour = new Uint8Array(1024);
  const io = {
    read(a) {
      if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800] | 0xF0;
      if (a === 0xDC00 || a === 0xDC01) return 0xFF;                   // no stick, no key
      if (a === 0xD018) return 0x8D;
      throw new Error('read $' + a.toString(16));
    },
    write(a, v) { if (a >= 0xD800 && a < 0xDC00) colour[a - 0xD800] = v & 15; },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  const hooks = {
    [L.sym('wait_frame')]: (c) => { c.rts(); },
    [L.sym('move_player')]: (c) => { m[0x536F] = level; m[0x2F] = PD_COURSE.MIDDLE; c.pc = L.sym('move_on'); },
  };
  m[0x2E] = 0; m[0x53E4] = course; m[0x53E5] = stage;
  cpu.call(L.sym('clear_text_screen'), {}, { maxSteps: 200000 });
  cpu.sp = 0xFF; cpu.pc = L.sym('stage_loop');
  cpu.run({ until: 0x08A2, maxSteps: 2000000, hooks: Object.assign({ 0x087B: () => { m[0x2F] = PD_COURSE.MIDDLE; } }, hooks) });
  return {
    m, colour,
    frame() { cpu.sp = 0xFF; cpu.pc = L.sym('race_frame_loop'); cpu.run({ until: 0x08F5, maxSteps: 2000000, hooks }); },
  };
}

const RANGES = [[0xE800, 0xEFFF], [0xF800, 0xFFFF]];
const ZP = [0x23, 0x25, 0x26, 0x2E, 0x53EA];
function same(where, a, b) {
  for (const [lo, hi] of RANGES) for (let i = lo; i <= hi; i++) if (a.m[i] !== b.m[i]) return fail(where, 'memory $' + i.toString(16), a.m[i], b.m[i]);
  for (const i of ZP) if (a.m[i] !== b.m[i]) return fail(where, '$' + i.toString(16), a.m[i], b.m[i]);
  for (let i = 200; i < 1000; i++) if (a.colour[i] !== b.colour[i]) return fail(where, 'colour RAM cell ' + i, a.colour[i], b.colour[i]);
}

// the page's picture against the video chip's model, on the registers the race sets
const BASE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x1B, 0, 0, 0, 0, 0xD8, 0, 0, 0xF0, 0xF1, 0xF0];
function chip(page) {
  const m = page.m, vic = BASE.concat(new Array(47 - BASE.length).fill(0xF0));
  vic[0x15] = 0;                                                       // no sprites: no karts
  vic[0x18] = m[0x399F + m[0x2E]] | 1; vic[0x20] = 0xF0;
  vic[0x21] = 0xF0 | m[0x25]; vic[0x22] = 0xF0 | m[0x53EA]; vic[0x23] = 0xF0;
  const T = 256 * m[0x23] + 204;
  const r = C64.renderFrame({ standard: 'PAL', lines: 312, cycles: 63, vic, cia2: [0xC4, 0x3F],
    writes: [[Math.floor(T / 63), T % 63, 0xD021, 0xF0 | m[0x26]]], mem: m, colourMem: page.colour });
  const out = new Uint8Array(320 * 160);
  for (let y = 0; y < 160; y++) for (let x = 0; x < 320; x++) out[y * 320 + x] = r.px[(y + 91 - r.line0) * r.w + x + 24 - r.x0];
  return out;
}
const px = new Uint8Array(320 * 160);
function picture(where, page) {
  viewPixels(page.m, page.colour, px);
  const want = chip(page);
  for (let i = 0; i < px.length; i++) if (px[i] !== want[i]) return fail(where, 'pixel', i % 320, Math.floor(i / 320), px[i], want[i]);
  drawn++;
}

function drive(course, stage, level) {
  const name = 'ABCDE'[course] + (stage + 1) + ' at level ' + level;
  const page = createCourse(L.ram, kit), gm = theGame(course, stage, level);
  page.start(course, stage);
  same(name + ' start', page, gm);
  picture(name + ' start', page);
  let n = 0;
  while (page.frame(level)) {
    gm.frame(); n++;
    if (bad < 10) same(name + ' frame ' + n, page, gm);
    if (n % 100 === 0) picture(name + ' frame ' + n, page);
  }
  frames += n;
  if (page.steps() !== PD_COURSE.LAP) fail(name, 'drove', page.steps(), 'steps');
  return n;
}

for (let c = 0; c < 5; c++) for (let s = 0; s < 5; s++) drive(c, s, 32);
const r = L.ram, w = (a) => r[a] | r[a + 1] << 8;
let jump = -1;
for (let i = 0; i < 25 && jump < 0; i++) for (let a = w(w(0x3733 + 2 * Math.floor(i / 5)) + 2 * (i % 5)); w(a) !== 0xFFFF; a += 2) if (w(a) === L.sym('piece_jump')) { jump = i; break; }
if (jump < 0) fail('no stage has a jump');
else drive(Math.floor(jump / 5), jump % 5, 10);
console.log(`26 laps, ${frames} race frames, ${drawn} pictures: ` + (bad ? bad + ' differences' : 'every view matches the game\'s own race_frame_loop, and every picture the video chip\'s model'));
process.exit(bad ? 1 : 0);
