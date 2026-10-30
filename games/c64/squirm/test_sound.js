#!/usr/bin/env node
// Hold the page's sound players (the sq-sound block: createDriver, run as sid.js runs it in the
// AudioWorklet, from its own source text) against the game's own code running as it does on the
// machine. Here the game side runs on the kit's simulator over the listing's whole memory, with an
// interrupt every SQ_PERIOD cycles (CIA 1's timer as the KERNAL leaves it): the handler the vector
// at $0314 names, then the jiffy clock $A2 counted up, as $EA31 does. The SID's data bus answers
// reads as VICE's does (C64Sid.engine().createBus, on the button's chip). Each button starts the
// game side from where the page's driver starts it: new_game's set-up of the chip ($3B25-$3B5B),
// then
//   title, level, death   the routine the driver enters, up to the address it stops at
//   bonus                 bonus_run ($3780) to the end of the run ($3878), the interrupt
//                         changing to bonus_irq on the way, the player standing still, at the
//                         button's speed (step_delay)
//   treasure              the main loop at level_stage 2, the player standing still on its start
//                         cell; the worms move, and a life the worms take is skipped ($3C34 on to
//                         $3C44), since a death has a button of its own
//   eggs                  the main loop with no movers (move_creatures returns at once) and an egg
//                         put under the player before each pass, to the 255th
//   climb                 game_over_screen ($3266) up to the name entry, which goes on at $3179,
//                         three letters taken, with a fifth row whose score beats the four above
// Every jiffy, the writes to the SID ($D400-$D418) must be the driver's in the same order with the
// same values, from the first jiffy (the game side's set-up with it) to the driver's last, where
// the driver's are a prefix of the game's: the game goes on to its next thing, the driver stops. It
// exits 1 on any difference.
//   node games/c64/squirm/test_sound.js
'use strict';
const path = require('path'), vm = require('vm');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
g.sameBlock('sq-sound');
const page = g.run('index.html', 'sq-sound', 'createDriver', 'SQ_MUSIC', 'SQ_EFFECTS', 'SQ_BONUS', 'SQ_PERIOD');
const createDriver = vm.runInNewContext('(' + page.createDriver + ')', {});
const P = page.SQ_PERIOD;
g.lib('sid');
const L = g.listing();
const bytes = L.ram.slice(0x0800, 0x3F48);

const STOP = { title: 0x3BCD, level: 0x3906, death: 0x3AC4, bonus: 0x3878 };
function gameSide(s, jiffies) {
  const m = L.ram.slice(), bus = C64Sid.engine().createBus(s.chip || '8580');
  const vic = new Uint8Array(64), colour = new Uint8Array(1024);
  let frame = [], stopped = false;
  const io = {
    read(a, cpu) {
      if (a === 0xDC01) return 0xFF;
      if (a >= 0xD400 && a <= 0xD41F) return bus.read(a & 31, cpu.cycles, 0);
      if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800];
      if (a >= 0xD000 && a < 0xD040) return vic[a & 63];
      return 0;
    },
    write(a, v, cpu) {
      if (a >= 0xD400 && a <= 0xD418) { frame.push(a - 0xD400, v); bus.write(v, cpu.cycles); }
      else if (a >= 0xD800 && a < 0xDC00) colour[a - 0xD800] = v & 15;
      else if (a >= 0xD000 && a < 0xD040) vic[a & 63] = v;
    },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  const go = (pc, until, hooks) => { cpu.pc = pc; cpu.sp = 0xF0; cpu.run({ until, hooks: hooks || {}, maxSteps: 2e6 }); };
  go(0x3B25, 0x3B5C);                                    // new_game: the chip's set-up
  const hooks = {}, k = s.kind;
  if (STOP[k]) hooks[STOP[k]] = () => { stopped = true; return true; };
  m[0xFB] = m[0xFD] = 0xE0; m[0xFC] = m[0xFE] = 0x05; m[0x57] = 0xEF;
  if (k === 'death') m.fill(0xA0, 0x0798, 0x07E8);
  else {
    cpu.call(0x23FA, {});                                // draw_status_lines
    cpu.call(0x246A, {}); cpu.call(0x35E8, {}); cpu.call(0x3669, {});   // maze 1, its colours, the worms
  }
  m[0x2689] = 0x100 - (s.pass || 6);                     // step_delay
  m[0x2685] = 3; m[0x2690] = 0; m[0x268D] = 0; m[0x268E] = 0x47; m[0x268F] = 0;
  m[0x268A] = 0x55; m[0x268B] = 0x07;
  m[0xA2] = 0;
  let pc = { title: 0x3BB2, level: 0x38B0, death: 0x3A7D, bonus: 0x3780, treasure: 0x3BF6, eggs: 0x3BF6, climb: 0x3266 }[k];
  if (k === 'treasure') { m[0x2688] = 2; hooks[0x3C34] = (c) => { c.pc = 0x3C44; return false; }; }
  if (k === 'eggs') {
    m[0x2688] = 1;
    hooks[0x3A46] = (c) => { c.rts(); return false; };
    hooks[0x3BF6] = (c) => { c.m[0x05E0] = 0x46; return false; };
  }
  if (k === 'climb') {
    hooks[0x30DE] = (c) => { c.m.fill(0x39, 0x0642, 0x0648); c.pc = 0x3179; return false; };
    hooks[0x3263] = () => { stopped = true; return true; };
  }
  cpu.pc = pc; cpu.sp = 0xF0; cpu.i = 0;                // the game runs with interrupts on
  const t0 = cpu.cycles, frames = [];
  for (let j = 0; j < jiffies && !stopped; j++) {
    const end = t0 + (j + 1) * P;
    while (cpu.cycles < end && !stopped) cpu.run({ cycles: end - cpu.cycles, hooks, maxSteps: 1e7 });
    frames.push(frame); frame = [];
    if (stopped) break;
    for (let n = 0; cpu.i && !stopped; n++) {           // the interrupt waits for CLI
      if (n > 1000) throw new Error(s.name + ': interrupts off for 1,000 instructions at $' + cpu.pc.toString(16));
      cpu.run({ cycles: 1, hooks });
    }
    const v = m[0x314] | m[0x315] << 8;
    if (v !== 0xEA31) cpu.irq(v, { kernal: true });
    m[0xA2] = (m[0xA2] + 1) & 0xFF;
  }
  return frames;
}

let bad = 0, buttons = 0, jiffies = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const list of [page.SQ_MUSIC, page.SQ_EFFECTS, page.SQ_BONUS]) list.forEach((s, t) => {
  const d = createDriver({ bytes, at: 0x0800, sounds: list, period: P }, kit);
  d.init(t);
  const mine = [];
  while (d.playing() && mine.length < 5000) { d.play(); mine.push(d.writes.slice()); }
  const theirs = gameSide(s, mine.length + 1);
  buttons++;
  for (let j = 0; j < mine.length; j++) {
    jiffies++;
    const a = mine[j].join(), b = (theirs[j] || []).join(), last = j === mine.length - 1;
    if (last ? !(b === a || b.startsWith(a + ',')) : a !== b) { fail(s.name, 'jiffy ' + j, 'game: ' + b, '| page: ' + a); break; }
  }
});
console.log(`${buttons} buttons, ${jiffies} jiffies: ` + (bad ? bad + ' differ' : 'every write to the SID matches the game\'s own code, jiffy by jiffy'));
process.exit(bad ? 1 : 0);
