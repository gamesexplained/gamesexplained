#!/usr/bin/env node
'use strict';
// Hold the Controls page's claims to the game's own code. controls.html's qx-stick block runs
// read_stick ($83DF) on the kit's 6502 over the listing, with CIA 1 read as the play interrupt leaves
// it. This runs the page's block on each case the page's copy states, and checks what the game's
// code arrives at in stick ($2E) and last_dir ($840C); and it runs read_stick on the simulator
// directly, over a fresh copy of the listing, to check that the page's block is the game's code and
// not a model of it. It also checks the code the copy names: the menu's read of both ports, the
// pause loop's read, the NMI's bare return, and where the fire button is stored for the points.
// Everything it needs is committed.
//   node games/c64/qix/test_controls.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'controls.html';
g.lib('cpu6502');
const { makeStick } = g.run(page, 'qx-stick', 'makeStick');
const L = g.listing(), base = L.ram.slice();
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
let bad = 0, n = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
const h2 = (v) => '$' + v.toString(16).toUpperCase().padStart(2, '0');

// the same routine on the simulator directly, its memory kept from case to case
const direct = base.slice();
let held = { joy1: 0, joy2: 0 };
const cpu = new CPU(direct, { port: 0x35, io: {
  read(a) {
    if (a === 0xDC00) return ~held.joy2 & 0xFF;
    if (a === 0xDC01) return ~held.joy1 & 0xFF;
    throw new Error('read_stick read ' + h2(a));
  },
  write(a) { throw new Error('read_stick wrote ' + h2(a)); },
} });
const S = makeStick(base);
function expect(name, h, want) {
  n++;
  const r = S.read(h);
  held = h; cpu.call(0x83DF, { a: 0, x: 0, y: 0, d: 0 });
  if (direct[0x2E] !== r.stick || direct[0x840C] !== r.last) fail(name, 'the page gives', h2(r.stick), h2(r.last), 'the routine', h2(direct[0x2E]), h2(direct[0x840C]));
  for (const k of Object.keys(want)) if (r[k] !== want[k]) fail(name, k, h2(r[k]), 'want', h2(want[k]));
}
function clear() { S.clear(); direct[0x840C] = 0; direct[0x2E] = 0; }

// section 01: either port plays, five bits in $2E
for (const [b, nm] of [[UP, 'up'], [DOWN, 'down'], [LEFT, 'left'], [RIGHT, 'right'], [FIRE, 'fire']]) {
  clear(); expect(nm + ' on port 1', { joy1: b, joy2: 0 }, { stick: b });
  clear(); expect(nm + ' on port 2', { joy1: 0, joy2: b }, { stick: b });
}
// section 02: the same on both sticks cancels; different directions combine
for (const [b, nm] of [[UP, 'up'], [DOWN, 'down'], [LEFT, 'left'], [RIGHT, 'right'], [FIRE, 'fire']]) {
  clear(); expect(nm + ' on both', { joy1: b, joy2: b }, { stick: 0 });
}
clear(); expect('slow draw: up and fire on port 2', { joy1: 0, joy2: UP | FIRE }, { stick: UP | FIRE });
expect('the other stick\'s fire as well', { joy1: FIRE, joy2: UP | FIRE }, { stick: UP });
clear(); expect('up on port 1, left on port 2, from rest: a diagonal', { joy1: UP, joy2: LEFT }, { stick: 0, last: 0 });
// section 03: a diagonal keeps the last straight direction, from rest none
clear(); expect('up', { joy1: 0, joy2: UP }, { stick: UP, last: UP });
expect('then up and left', { joy1: 0, joy2: UP | LEFT }, { stick: UP, last: UP });
expect('then left', { joy1: 0, joy2: LEFT }, { stick: LEFT, last: LEFT });
expect('then down and left', { joy1: 0, joy2: DOWN | LEFT }, { stick: LEFT, last: LEFT });
expect('then down and left with fire', { joy1: 0, joy2: DOWN | LEFT | FIRE }, { stick: LEFT | FIRE, last: LEFT });
clear(); expect('a diagonal from rest', { joy1: 0, joy2: UP | RIGHT }, { stick: 0, last: 0 });
expect('with fire', { joy1: 0, joy2: DOWN | RIGHT | FIRE }, { stick: FIRE, last: 0 });

// the code the copy names
const code = new Map(L.listing.records.filter((r) => r.t === 'code').map((r) => [r.a, r]));
const opnd = (r) => (r.b && r.b.length === 3 ? r.b[1] | r.b[2] << 8 : r.b && r.b.length === 2 ? r.b[1] : undefined);
const at = (a, m, o) => { const r = code.get(a); if (!r || r.m !== m || (o !== undefined && opnd(r) !== o)) fail('no', m, o === undefined ? '' : o, 'at', '$' + a.toString(16).toUpperCase()); };
at(0x821C, 'lda', 0xDC00); at(0x821F, 'eor', 0xDC01);           // the menu reads both ports as one
at(0x81EB, 'lda', 0xDC00); at(0x81EE, 'eor', 0xDC01); at(0x81F1, 'beq');   // the pause waits for a change
at(0x83A1, 'jsr', 0xB803); at(0x83B1, 'jsr', 0x83DF);            // the play interrupt: effects, then the stick
at(0x839E, 'jsr', 0x81D9);                                       // pause_check every frame
at(0x99BF, 'sta', 0x27); at(0x9994, 'bit', 0x27);               // fire stored each step, read at the line's end
// the start-up points the NMI vector at a bare RTI: LDA #lo, STA $FFFA, LDA #hi, STA $FFFB ($8003-$800D)
at(0x8005, 'sta', 0xFFFA); at(0x800D, 'sta', 0xFFFB);
const nmi = code.get(0x8003).b[1] | code.get(0x800B).b[1] << 8;
if (L.ram[nmi] !== 0x40) fail('the NMI vector', '$' + nmi.toString(16), 'is not an RTI');
// every read of the joystick ports reads both as one: LDA $DC00 then EOR $DC01, apart from
// read_runstop's keyboard read of $DC01 alone ($81BB, $81BE), with row 7 selected
let reads = 0;
for (const r of L.listing.records) {
  if (r.t !== 'code' || !r.b || r.b.length !== 3 || (opnd(r) !== 0xDC00 && opnd(r) !== 0xDC01) || /^st/.test(r.m)) continue;
  if (r.a === 0x81BB || r.a === 0x81BE) continue;
  if (r.m === 'lda' && opnd(r) === 0xDC00) {
    const next = code.get(r.a + 3);
    if (!next || next.m !== 'eor' || opnd(next) !== 0xDC01) fail('a read of port 2 alone at', '$' + r.a.toString(16).toUpperCase());
    reads++;
  } else if (!(r.m === 'eor' && opnd(r) === 0xDC01 && code.get(r.a - 3) && code.get(r.a - 3).m === 'lda')) fail('a read of the ports at', '$' + r.a.toString(16).toUpperCase(), r.m);
}
if (reads < 5) fail('only', reads, 'reads of both ports');
console.log(bad ? `${bad} failures` : `ok: ${n} cases of read_stick, page and routine alike, and the code the copy names`);
process.exit(bad ? 1 : 0);
