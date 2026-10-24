#!/usr/bin/env node
// Hold the pages' panel messages and ending against the game's own routines. The ant-room block
// (ANT), the same on every page that carries it, scrolls the messages and dissolves the playfield
// from the listing's bytes. Here the game's routines run on the kit's 6502 over the listing's whole
// memory:
// - scroll_message ($AA68), once a frame for 1,500 frames from each of the 22 messages started as
//   start_message starts one: the strip's eleven characters ($77A8-$77FF), the letter buffer
//   ($0672), the offset and pixel counts ($55, $56) and the message (zp_msg_scroll) after every
//   frame, against ANT.messageFrame;
// - victory_sequence ($8AD9) in room $00 as build_room leaves it, the mine gone off and the
//   countdown and message over: at each of its waits ($8B3C, where the wait is cut short) the
//   character set at $7800 and what it wrote to $D011, $D020 and $D021, against ANT.endStep, then
//   at the wait for fire ($8B4C) the message it queued and what reset_tal_end put back.
// It exits 1 on any difference.
//   node games/c64/the-sacred-armour-of-antiriad/test_ending.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
g.sameBlock('ant-room');
const { ANT } = g.run('index.html', 'ant-room', 'ANT');
const L = g.listing(), sym = L.sym, FRAMES = 1500;
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
const hex = (n) => '$' + n.toString(16).toUpperCase().padStart(2, '0');
// the game's memory; $D011, $D020 and $D021 read back what was written, the colours with the four
// bits the chip sets; other VIC writes are dropped and any other I/O stops the run
function machine(m, vic) {
  const io = {
    read(a) {
      if (a === 0xD011) return vic.d011;
      if (a === 0xD020 || a === 0xD021) return 0xF0 | vic[a === 0xD020 ? 'd020' : 'd021'];
      throw new Error('read ' + hex(a));
    },
    write(a, v) {
      if (a === 0xD011) vic.d011 = v;
      else if (a === 0xD020) vic.d020 = v & 15;
      else if (a === 0xD021) vic.d021 = v & 15;
      else if (a >= 0xD800 && a < 0xDC00) return;
      else if (a < 0xD000 || a >= 0xD800) throw new Error('write ' + hex(a));
    },
  };
  return new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
}
const vic0 = () => ({ d011: 0x1B, d020: 0, d021: 0 });

let msgFrames = 0;
for (let n = 0x80; n < 0x96; n++) {
  const m = L.ram.slice(), cpu = machine(m, vic0()), st = ANT.message();
  m.fill(0, 0x77A8, 0x7800);
  m[0x55] = m[0x56] = 0;
  m[sym('zp_msg_scroll')] = n;
  m[sym('zp_panel_on')] = 0x80;
  ANT.messageStart(st, n);
  for (let f = 1; f <= FRAMES; f++) {
    cpu.call(sym('scroll_message'), { a: 0, x: 0, y: 0 }, { maxSteps: 100000 });
    ANT.messageFrame(L.ram, st);
    msgFrames++;
    let d = '';
    for (let i = 0; i < 88 && !d; i++) if (m[0x77A8 + i] !== st.strip[i]) d = 'strip byte ' + hex(0x77A8 + i) + ' ' + hex(m[0x77A8 + i]) + ' / ' + hex(st.strip[i]);
    for (let y = 0; y < 8 && !d; y++) if (m[0x0672 + y] !== st.buf[y]) d = 'buffer byte ' + y;
    if (!d && (m[0x55] !== st.off || m[0x56] !== st.pix || m[sym('zp_msg_scroll')] !== st.msg))
      d = 'offset, pixel, message ' + [m[0x55], m[0x56], m[sym('zp_msg_scroll')]].map(hex) + ' / ' + [st.off, st.pix, st.msg].map(hex);
    if (d) { fail('message', hex(n), 'frame', f, d); break; }
  }
}

let steps = 0, stepCycles = 0;
{
  const m = L.ram.slice(), vic = vic0(), cpu = machine(m, vic);
  m[0x85C1] = 0x60;
  m[0x5B] = 0;
  cpu.call(sym('build_room'), { a: 0, x: 0, y: 0 }, { maxSteps: 2000000 });
  m[0x85C1] = L.ram[0x85C1];
  const R = ANT.room(L.ram, 0), v = { scroll: 3, border: 0, bg: 0 };
  m[sym('zp_victory')] = 0x80;
  m[sym('zp_countdown')] = 0;
  m[sym('zp_msg_scroll')] = 0;
  m[sym('zp_panel_on')] = 0x80;
  m.fill(0, sym('message_queue'), sym('message_queue') + 8);
  let c0 = 0, done = false;
  const check = (what) => {
    let d = '';
    for (let a = 0; a < 0x800 && !d; a++) if (m[0x7800 + a] !== R.shapes[a]) d = 'character byte ' + hex(0x7800 + a) + ' ' + hex(m[0x7800 + a]) + ' / ' + hex(R.shapes[a]);
    if (!d && ((vic.d011 & 7) !== v.scroll || vic.d020 !== v.border || vic.d021 !== v.bg))
      d = 'fine scroll, border, background ' + [vic.d011 & 7, vic.d020, vic.d021].join(',') + ' / ' + [v.scroll, v.border, v.bg].join(',');
    if (d) fail(what, d);
  };
  const hooks = {
    0x8AE6: (c) => { c0 = c.cycles; },
    0x8B3C: (c) => {
      stepCycles += c.cycles - c0;
      ANT.endStep(L.ram, R.shapes, steps, v);
      check('dissolve step ' + steps);
      steps++;
      m[sym('zp_wait')] = 0;
      c0 = c.cycles + 6;
    },
    0x8B4C: () => { done = true; return true; },
  };
  cpu.call(sym('victory_sequence'), { a: 0, x: 0, y: 0 }, { maxSteps: 2000000, hooks });
  v.scroll = 3; v.border = v.bg = 0;
  if (!done) fail('victory_sequence', 'returned before the wait for fire');
  check('after reset_tal_end');
  if (steps !== 9) fail('victory_sequence', steps + ' dissolve steps');
  if (![...m.subarray(sym('message_queue'), sym('message_queue') + 8)].includes(0x95)) fail('victory_sequence', 'did not queue message $95');
}

console.log(`22 messages over ${FRAMES} frames each (${msgFrames} frames) and the ending's ${steps} dissolve steps, ` +
  `${Math.round(stepCycles / Math.max(steps, 1))} cycles each before its wait: ` +
  (bad ? bad + ' differences' : 'every strip, character and register matches the game'));
process.exit(bad ? 1 : 0);
