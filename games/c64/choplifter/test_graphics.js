#!/usr/bin/env node
'use strict';
// The Graphics tab. Its ch-gfx block draws shapes the way the game's blitters do and puts the
// helicopter, the people, the clouds, the mine, the tank, the jet, the base and the sheds together
// the way the routines that draw them do. This runs the game from listing.json on the kit's machine
// model, flies it with a fixed sequence of stick moves, and checks the block against the game:
// - every shape the game draws, flipped or not, leaned or not, at either bit, gives the bits the
//   game's blitter puts in the bitmap;
// - the helicopter, for every facing, tilt and skid flag, gives the whole picture the game draws;
// - the rotor counters, the facing and the tilt step as the tab steps them;
// - each person, cloud, mine, tank piece and jet frame is the shape, the way round and the place
//   the game draws it at, a walker moves two bits a pass and a tank four;
// - the base and the sheds come out bit for bit as the game draws them;
// - a pass takes the cycles CH_PASS gives, give or take five per cent, on the pad beside the base
//   and flying forward with nothing but the hills about.
//   node games/c64/choplifter/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine } = require(path.join(ROOT, 'kit/c64/machine.js'));
const g = game(__dirname);
const B = g.run('graphics.html', 'ch-gfx', 'CH_PASS', 'chShape', 'chPicture', 'chBlit', 'chFill', 'chAlign', 'chHeli',
  'chNextMain', 'chNextTail', 'chTurn', 'chPerson', 'CH_PERSON_TOP', 'chBoom', 'chMine', 'chTank', 'chJet', 'chBase', 'chShed');
const L = g.listing();
let bad = 0;
const fail = (...w) => { bad++; if (bad < 40) console.log('FAIL', ...w); };
const s8 = (v) => (v > 127 ? v - 256 : v);

const ram = L.ram, ro = ram.slice();   // the shapes and tables as the listing has them
const M = new Machine({ ram, pc: 0x959C, port: { dir: 0x2F, data: 0x36 }, passAt: 0x966F, dma: true, cia: true,
  rom: { char: new Uint8Array(4096) } });
M.cpu.i = 1;
M.hooks[0xFF9F] = (c) => { ram[0xC5] = 0x40; c.rts(); return false; };   // SCNKEY: no key down

const shapeAt = new Map();
for (let i = 0; i < 75; i++) shapeAt.set(ro[0x8009 + 2 * i] | (ro[0x800A + 2 * i] << 8), i);
const buffer = () => ((ram[0x0F] & 0x40) ? 0x6000 : 0x2000);
const win = () => ram[0x3B] | (ram[0x3C] << 8);
const slot = () => ram[0x72];
const actorX = (x) => ram[0x0B78 + x] | (ram[0x0B79 + x] << 8);
const actorRow = (x) => (ram[0x0B7A + x] + ram[0x0B7B + x]) & 255;
// The bitmap the game would hold if a picture of the whole play area were ORed into a copy.
function over(snap, P) {
  const want = snap.slice();
  for (let row = 0; row < 168; row++) for (let x = 0; x < 320; x++)
    if (P.bits[(167 - row) * 320 + x]) { const line = 199 - row; want[320 * (line >> 3) + (line & 7) + 8 * (x >> 3)] |= 0x80 >> (x & 7); }
    else if (P.clear && P.clear[(167 - row) * 320 + x]) { const line = 199 - row; want[320 * (line >> 3) + (line & 7) + 8 * (x >> 3)] &= ~(0x80 >> (x & 7)); }
  return want;
}
function differs(want, b) { let n = 0; for (let i = 0; i < 8000; i++) if (want[i] !== ram[b + i]) n++; return n; }
function draw(P, d, x, row) {
  if (d.fill) {
    // A fill stores: keep the cleared bits too, so over() can clear them.
    P.clear = P.clear || new Uint8Array(P.W * P.H);
    const Q = B.chPicture(P.W, P.H, P.base);
    B.chFill(Q, x, row, d.cells, d.rows, d.pattern);
    const x0 = x & ~7;
    for (let r = 0; r < d.rows; r++) for (let k = 0; k < d.cells * 8; k++) {
      const xx = x0 + k, rr = row - r - P.base; if (xx < 0 || xx >= P.W || rr < 0 || rr >= P.H) continue;
      const i = (P.H - 1 - rr) * P.W + xx;
      if (Q.bits[i]) P.bits[i] = 1; else P.clear[i] = 1;
    }
    return;
  }
  B.chBlit(P, B.chShape(ro, d.shape), x, row, d.how, d.run || 0, d.step || 0);
}

// Shapes 14 and 15 are drawn only on the pass the skids bite, which the poking covers.
function never() { return [...Array(75).keys()].filter((i) => !blitsSeen.has(i) && i !== 14 && i !== 15); }

// 1. Every blit: the bitmap as the blitter leaves it against chBlit, for the first few of each
// shape, way round and bit, where nothing is clipped.
const HOW = { 0x8FD3: 'p', 0x903E: 'm', 0x90D2: 's', 0x90DF: 'S' };
const blitDone = new Map(), blitsSeen = new Set();
let blit = null, onBlit = null;
for (const a of Object.keys(HOW).map(Number)) M.hooks[a] = () => {
  const i = shapeAt.get(ram[0x37] | (ram[0x38] << 8)), x = ram[0x04] | (ram[0x05] << 8), row = ram[0x03];
  const info = { shape: i, how: HOW[a], x, row, run: ram[0x2B], step: s8(ram[0x2C]) };
  if (onBlit) onBlit(info);
  if (i === undefined) { fail('a blit of a shape not in the table', (ram[0x37] | (ram[0x38] << 8)).toString(16)); return; }
  const key = i + info.how + (x & 1);
  blitsSeen.add(i);
  const s = B.chShape(ro, i), clipped = ram[0x22] | ram[0x23] | ram[0x24] | ram[0x25];
  if ((blitDone.get(key) || 0) >= 6 || clipped || x < 8 || x + s.w > 304 || row > 160 || row - s.h < 8) return;
  blitDone.set(key, (blitDone.get(key) || 0) + 1);
  blit = { info, b: buffer(), snap: ram.slice(buffer(), buffer() + 8000) };
};
function blitEnd() {
  if (!blit) return;
  const { info, b, snap } = blit; blit = null;
  const P = B.chPicture(320, 168, 0);
  B.chBlit(P, B.chShape(ro, info.shape), info.x, info.row, info.how, info.run, info.step);
  const n = differs(over(snap, P), b);
  if (n) fail('shape', info.shape, info.how, 'at bit', info.x, 'row', info.row, ': the tab and the game differ in', n, 'bytes');
}
M.hooks[0x9037] = blitEnd; M.hooks[0x90C3] = blitEnd; M.hooks[0x9221] = blitEnd;

// 2. The helicopter, every facing, tilt and skid flag, poked just before the game draws it.
const combos = [];
for (let f = -3; f <= 3; f++) for (let t = -5; t <= 5; t++) for (const bite of [0, 1]) combos.push([f, t, bite]);
let heli = null, combo = -1;
M.hooks[0xAFEF] = () => {
  if (combo >= 0 && combo < combos.length) { const [f, t, bite] = combos[combo]; ram[0x59] = f & 255; ram[0x5A] = t & 255; ram[0x60] = bite; }
  if (ram[0x62]) return;
  const x = slot(), b = buffer();
  heli = { ax: actorX(x) - win(), arow: actorRow(x), face: s8(ram[0x59]), tilt: s8(ram[0x5A]), bite: ram[0x60],
    main: ram[0x0B61] === 0 ? 4 : ram[0x0B61] - 2, tail: ram[0x0B62] === 0 ? 6 : ram[0x0B62] - 2, b, snap: ram.slice(b, b + 8000) };
};
const heliDone = new Set();
M.hooks[0xAFF8] = () => {
  if (!heli) return;
  const h = heli; heli = null;
  if (h.ax < 24 || h.ax > 296) return;
  const P = B.chPicture(320, 168, 0);
  for (const d of B.chHeli(ro, h.face, h.tilt, h.main, h.tail, h.bite)) draw(P, d, h.ax + d.dx, h.arow + d.dy);
  const n = differs(over(h.snap, P), h.b);
  if (n) fail('the helicopter facing', h.face, 'tilt', h.tilt, 'skids', h.bite, ': the tab and the game differ in', n, 'bytes');
  else heliDone.add(h.face + ',' + h.tilt + ',' + h.bite);
  if (combo >= 0 && combo < combos.length) combo++;
};

// 3. People: a pending direction and step is poked into the first person drawn on the screen.
const personWant = [];
for (const dir of [0, 1, 0xFF, 2, 0xFE]) for (let p = 0; p < 4; p++) personWant.push([dir, p]);
const personDone = new Set();
let person = null;
M.hooks[0x9D56] = (c) => {
  const x = c.x;
  const X = ram[0x0CA2 + x] | (ram[0x0CA3 + x] << 8), sx = X - 4 - win();
  if (personWant.length && sx > 16 && sx < 296) { const [dir, p] = personWant[0]; ram[0x0CA1 + x] = dir; ram[0x0CA0 + x] = p; }
  person = { X, dir: ram[0x0CA1 + x], phase: ram[0x0CA0 + x] };
};
const walkers = new Map();
// 4. Clouds, the mine, tanks and jets: what each handler is about to draw.
let boom = null, mine = null, tank = null, jet = null, tankParts = [];
M.hooks[0xB106] = () => { const x = slot(); boom = { frame: ram[0x0B75 + x], ground: ram[0x0B74 + x] === 2, ax: actorX(x) - win(), arow: actorRow(x) }; };
M.hooks[0xB73D] = () => { const x = slot(); mine = { ax: actorX(x) - win(), arow: actorRow(x), flip: ram[0x89] & 1 }; };
const tankX = new Map();
M.hooks[0xA0BB] = () => {
  const x = slot(), X = actorX(x);
  // A jump of more than eight is another tank in the same slot.
  if (tankX.has(x)) { const d = X - tankX.get(x); if (![0, 4, -4].includes(d) && Math.abs(d) <= 8) fail('a tank moved', d, 'in a pass'); }
  tankX.set(x, X);
  tank = { X, aim: ram[0x0B77 + x], ax: X - win(), arow: actorRow(x) }; tankParts = [];
};
// Jets: a cruising jet is started on a manoeuvre not yet seen whole, and then left to fly it.
const jetWant = new Set();
for (let st = 1; st <= 4; st++) for (let r = 0; r < B.chJet(ro, st).recs.length; r++) jetWant.add(st + ':' + r);
let pokeJets = false;
M.hooks[0xAD8F] = () => {
  const x = slot();
  const ax = actorX(x) - win();
  if (pokeJets && (ram[0x0B75 + x] & 0x7F) === 0 && ax > 60 && ax < 200) {
    for (let st = 1; st <= 4; st++) if ([...jetWant].some((k) => k.startsWith(st + ':'))) { ram[0x0B75 + x] = st; ram[0x0B76 + x] = 0; break; }
  }
  // $AD91 doubles the state into its tables, so a state with bit 7 set draws as the one without.
  jet = { state: ram[0x0B75 + x] & 0x7F, rec: ram[0x0B76 + x], face: ram[0x0B77 + x] & 0x80 ? -1 : 1, X: actorX(x), ax: actorX(x) - win(), arow: actorRow(x), slot: x };
};
M.hooks[0xAE68] = () => {
  if (!jet || jet.moved) return;
  const m = B.chJet(ro, jet.state), r = m.recs[jet.state === 0 ? 0 : jet.rec];
  const d = (actorX(jet.slot) - jet.X + 0x10000) % 0x10000, want = (jet.face * r[1] + 0x10000) % 0x10000;
  if (d !== want) fail('jet state', jet.state, 'record', jet.rec, 'moved', s8(d & 255), 'the tab', jet.face * r[1]);
  jet.moved = true;
};
const counts = { boom: new Set(), mine: new Set(), tank: new Set(), base: 0, shed: new Set() };
onBlit = (o) => {
  const at = M.cpu.pc;
  if (o.shape >= 55 && o.shape <= 63 && person) {
    const want = B.chPerson(person.dir, person.phase), sx = ((person.X - 4) ^ ((ram[0x75] & 1) ^ 1)) - win();
    if (o.shape !== want.shape || o.how !== want.how) fail('person dir', person.dir, 'step', person.phase, 'the game draws', o.shape, o.how, 'the tab', want.shape, want.how);
    if (o.row !== B.CH_PERSON_TOP) fail('a person drawn at row', o.row, 'the tab', B.CH_PERSON_TOP);
    if (sx > 0 && sx < 300 && o.x !== sx) fail('a person at bit', o.x, 'expected', sx);
    if (sx > 0 && sx < 300 && (o.x & 1) !== 1 - (person.X & 1)) fail('a person at bit', o.x, 'for X', person.X);
    if (personWant.length && personWant[0][0] === person.dir && personWant[0][1] === person.phase) { personDone.add(person.dir + ':' + person.phase); personWant.shift(); }
    if (person.dir === 1 || person.dir === 0xFF) {
      const k = person.X; walkers.set(o.x, person);   // noted for the step check below
    }
    person = null;
  } else if (o.shape >= 51 && o.shape <= 54 && boom) {
    const d = B.chBoom(ro, boom.frame, boom.ground), x = B.chAlign(boom.ax + d.dx, 0);
    if (o.shape !== d.shape || o.how !== d.how) fail('cloud step', boom.frame, 'the game draws', o.shape, 'the tab', d.shape);
    if (boom.ax > 24 && boom.ax < 296 && (o.x !== x || o.row !== boom.arow + d.dy)) fail('cloud at', o.x, o.row, 'the tab', x, boom.arow + d.dy);
    counts.boom.add(boom.frame + (boom.ground ? 'g' : 'a')); boom = null;
  } else if (o.shape === 50 && mine) {
    const d = B.chMine(mine.flip), x = B.chAlign(mine.ax + d.dx, 0);
    if (o.how !== d.how) fail('the mine drawn', o.how, 'the tab', d.how);
    if (mine.ax > 24 && mine.ax < 296 && (o.x !== x || o.row !== mine.arow + d.dy)) fail('the mine at', o.x, o.row, 'the tab', x, mine.arow + d.dy);
    counts.mine.add(o.how); mine = null;
  } else if (o.shape >= 39 && o.shape <= 45 && tank) {
    const parts = B.chTank(ro, tank.X, tank.aim), d = parts.find((p) => p.shape === o.shape) || parts[2];
    tankParts.push(o.shape);
    if (o.shape !== d.shape || o.how !== d.how) fail('tank piece', tankParts.length, 'the game draws', o.shape, o.how, 'the tab', d.shape, d.how);
    else if (tank.ax > 24 && tank.ax < 296) {
      const x = B.chAlign(tank.ax + d.dx, 1);
      if (o.x !== x || o.row !== tank.arow + d.dy) fail('tank piece', d.shape, 'at', o.x, o.row, 'the tab', x, tank.arow + d.dy);
    }
    counts.tank.add(o.shape + o.how);
  } else if (o.shape >= 23 && o.shape <= 38 && jet) {
    const m = B.chJet(ro, jet.state), r = m.recs[jet.state === 0 ? 0 : jet.rec], s = B.chShape(ro, m.first + r[0]);
    const how = jet.face > 0 ? 'p' : 'm', x = B.chAlign(jet.ax - (s.w >> 1), 0), row = jet.arow + (s.h >> 1);
    if (o.shape !== m.first + r[0] || o.how !== how) fail('jet state', jet.state, 'record', jet.rec, 'the game draws', o.shape, o.how, 'the tab', m.first + r[0], how);
    if (jet.ax > 24 && jet.ax < 296 && row <= 167 && (o.x !== x || o.row !== row)) fail('jet at', o.x, o.row, 'the tab', x, row);
    jetWant.delete(jet.state + ':' + jet.rec);
  }
};

// 5. The base and the sheds, compared whole when all of them is on the screen.
let base = null;
M.hooks[0xBA49] = () => { const b = buffer(); base = { b, snap: ram.slice(b, b + 8000), flag: ram[0x89] & 1 }; };
M.hooks[0xBB24] = () => {
  if (!base) return;
  const { b, snap, flag } = base; base = null;
  const X = (((ram[0x75] & 1) ^ 0x54) | 0x1200) - win();
  if (X < 8 || X + 144 > 312) return;
  const P = B.chPicture(320, 168, 0);
  for (const d of B.chBase(ro, flag)) draw(P, d, X + d.dx, d.row);
  const n = differs(over(snap, P), b);
  if (n) fail('the base with flag', flag, 'at bit', X, ': the tab and the game differ in', n, 'bytes'); else counts.base++;
};
let sheds = null;
M.hooks[0xB8BA] = () => { const b = buffer(); sheds = { b, snap: ram.slice(b, b + 8000), flip: ram[0x89] & 1 }; };
M.hooks[0xB970] = () => {
  if (!sheds) return;
  const { b, snap, flip } = sheds; sheds = null;
  const lo = ((((ram[0x75] & 1) ^ 1) ^ 0x80) - 1) & 255, P = B.chPicture(320, 168, 0);
  let whole = true;
  for (let k = 0; k < 4; k++) {
    const S = (((3 + k) << 8) | lo) - 2 - win();
    if (S > -40 && S < 330 && (S < 8 || S + 28 > 312)) whole = false;
    for (const d of B.chShed(ram[0x0CF4 + k], flip)) draw(P, d, S + d.dx, d.row);
    if (S >= 8 && S + 28 <= 312) counts.shed.add(ram[0x0CF4 + k] + ':' + flip);
  }
  if (!whole) return;
  const n = differs(over(snap, P), b);
  if (n) fail('the sheds: the tab and the game differ in', n, 'bytes');
};

// The run. A game is started from the title. First, with the caps on tanks and jets at $A3B2
// and $A3B6 set to 0 so that nothing comes, the helicopter sits on the pad for 40 passes, takes
// off, turns round and flies left over the sheds: those passes give the timing. Then the caps go back, the
// difficulty is held at 3 so that jets and mines come and the helicopter count at 0 so that the
// game never ends, and the stick is moved by a fixed sequence for 5,000 passes, with the people
// poked through every direction and step. Last the helicopter is put through every combination,
// and then each jet through every record.
const STICK = 0x1F, UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 0x10;
M.runFrames(200); M.joy1 = STICK & ~FIRE; M.runFrames(10); M.joy1 = STICK; M.runPasses(4);
const caps = ro.slice(0xA3B2, 0xA3BA);
ram.fill(0, 0xA3B2, 0xA3BA);
let seed = 4242;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return seed >> 16; };
const passCycles = { open: [], base: [] };
const drawn = new Set();
const prevHook = onBlit;
onBlit = (o) => { drawn.add(o.shape); prevHook(o); };
let prev = null;
const turnSteps = new Set();
for (let i = 0; i < 12000; i++) {
  let j = STICK;
  if (i < 40) j = STICK;
  else if (i < 70) j &= ~UP;
  else if (i < 82) j &= ~FIRE;            // held long enough to turn the helicopter round
  else if (i < 90) j = STICK;
  else if (i < 390) j &= ~LEFT;
  else {
    if (i === 390) ram.set(caps, 0xA3B2);
    ram[0x8D] = 3; ram[0x0CFF] = 0;
    const k = rnd() % 16, far = ram[0x76] > 0x0B, near = ram[0x76] < 0x05;
    if (k < (far ? 9 : near ? 2 : 5)) j &= ~LEFT; else if (k < (near ? 10 : 8)) j &= ~RIGHT;
    if (k % 4 === 0) j &= ~FIRE; if (k % 7 === 0) j &= ~UP; if (k % 3 === 0) j &= ~DOWN;
  }
  if (i === 5390) combo = 0;
  if (combo >= combos.length) pokeJets = true;
  M.joy1 = j;
  drawn.clear();
  const c0 = M.cpu.cycles;
  M.runPasses(1);
  const dc = M.cpu.cycles - c0;
  // The timing: on the pad beside the base, and flying forward with only the hills about.
  if (i < 40 && drawn.has(65)) passCycles.base.push(dc);
  if (i >= 90 && i < 390 && ram[0x5D] && [...drawn].every((s) => s <= 22 || s === 64)) passCycles.open.push(dc);
  // The rotor counters, the facing and the tilt, pass to pass.
  const now = { main: ram[0x0B61], tail: ram[0x0B62], face: s8(ram[0x59]), tilt: s8(ram[0x5A]), turn: s8(ram[0x8A]), settle: ram[0x62], up: ram[0x5D] };
  if (prev && combo < 0 && !now.settle && !prev.settle) {
    if (now.main !== B.chNextMain(prev.main)) fail('the main rotor counter went', prev.main, 'to', now.main);
    if (Math.abs(prev.face) === 3 && Math.abs(now.face) === 3 && now.tail !== B.chNextTail(prev.tail)) fail('the tail rotor counter went', prev.tail, 'to', now.tail);
    if (prev.turn && prev.turn === now.turn && prev.face !== now.face) {
      turnSteps.add(prev.face + '>' + now.face);
      if (now.face !== B.chTurn(prev.face, 3 * now.turn)) fail('the facing went', prev.face, 'to', now.face, 'turning', now.turn);
    }
    if (now.up && prev.up && Math.abs(now.tilt - prev.tilt) > 1) fail('the tilt went', prev.tilt, 'to', now.tilt, 'in a pass in the air');
  }
  prev = now;
  if (combo >= combos.length && !personWant.length && !jetWant.size && never().length === 0) break;
}

// What the run reached.
if (never().length) fail('shapes the run never saw drawn:', never().join(' '));
if (heliDone.size < combos.length) fail('helicopter combinations matched', heliDone.size, 'of', combos.length);
if (personWant.length) fail('person states never reached:', personWant.map((p) => p.join(':')).join(' '));
if (jetWant.size) fail('jet records never reached:', [...jetWant].join(' '));
if (!turnSteps.has('1>-1') && !turnSteps.has('-1>1')) fail('no turn from one side to the other was seen:', [...turnSteps].join(' '));
if (counts.boom.size < 8) fail('cloud steps seen', [...counts.boom].sort().join(' '));
if (counts.mine.size < 2) fail('the mine was seen', [...counts.mine].join(' '));
if (counts.base < 2) fail('the base was compared', counts.base, 'times');
if (![...counts.shed].some((k) => k[0] === '1')) fail('no shed was seen blown open');
for (const [k, v] of Object.entries(passCycles)) {
  if (v.length < 20) { fail('only', v.length, 'passes of kind', k); continue; }
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  console.log('a pass of kind', k, 'takes', mean.toFixed(0), 'cycles over', v.length, 'passes; the tab', B.CH_PASS[k]);
  if (Math.abs(mean - B.CH_PASS[k]) > B.CH_PASS[k] * 0.05) fail('a pass of kind', k, 'takes', mean.toFixed(0), 'cycles, the tab', B.CH_PASS[k]);
}

if (bad) { console.log(bad, 'failed'); process.exit(1); }
console.log('ok: every shape, the helicopter, the people, the clouds, the mine, the tank, the jet, the base and the sheds are as the game draws them');
