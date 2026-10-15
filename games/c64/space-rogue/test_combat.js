'use strict';
// Holds Combat's fights (Ships and combat) to the engine. The page runs the engine's own main loop
// ($0DED) in a 6502 of its own (sr-sim): SRSim.fight empties every slot but the player's, sets the
// danger level to 0 so that no ship arrives, keeps the player still and neutral to the pirates and
// the Imperium, and creates the reader's ships where SRSim.place puts them (create_object, $1949;
// their models from the page's sr-models, through load_model's own relocation). Each pass runs
// everything the loop calls before its drawing, with no key pressed; the drawing is skipped as
// frame_skip3 ($A470) skips it when a pass runs late. This test
// - steps the page's 6502 and the kit's (kit/c64/cpu6502.js) through every documented opcode from
//   random states, and compares the registers and the memory;
// - runs fights in both: the page's on only the bytes ships.html embeds (its data-listing pieces of
//   the engine and flight listings, the display buffer at $4000-$63FF empty), the kit's on the whole
//   listings with the display buffer full of random bytes, set up as the page sets them up; and
//   compares every sample, every event and every byte the page knows at the end;
// - checks what the section says of those fights, and the flight section's turns and thrust.
//   node test_combat.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/c64/cpu6502.js'));
const g = game(__dirname);
const page = g.read('ships.html');
const MODELS = JSON.parse(page.match(/<script type="application\/json" id="sr-models">([^<]*)<\/script>/)[1]);
const { SRSim } = g.run('ships.html', 'sr-sim', 'SRSim');
const { SRShips } = g.run('ships.html', 'sr-ships', 'SRShips');
const ENGINE = g.listing('parts/engine/listing.json'), FLIGHT = g.listing('parts/flight/listing.json');
const RAM = new Uint8Array(ENGINE.ram);
RAM.set(FLIGHT.ram.subarray(0xA500, 0xBD00), 0xA500);                       // SEG0's maths
const EVERY = 8, CAP = 6000;
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
let seed = 1989;
const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7FFFFFFF) >> 16 & 255;
const IO = { read(a, c) { throw new Error('I/O read $' + a.toString(16) + ' at $' + c.pc.toString(16)); }, write() {} };

// ---- the 6502, opcode by opcode: 150 opcodes from 200 random states each; BRK, and an
// undocumented opcode, stop the page's
const DOC = new Set();
{
  const base = new Uint8Array(0x10000), m1 = new Uint8Array(0x10000), m2 = new Uint8Array(0x10000);
  let cases = 0;
  for (let op = 0; op < 256; op++) {
    for (let i = 0; i < 0x10000; i++) base[i] = rnd();
    for (let k = 0; k < 200; k++) {
      const pc = 0x0200 + rnd() * 128;
      for (let i = 0; i < 3; i++) base[pc + i] = rnd();
      base[pc] = op;
      for (let i = 0; i < 4; i++) base[rnd()] = rnd();                        // zero page pointers
      m1.set(base); m2.set(base);
      const r = { a: rnd(), x: rnd(), y: rnd(), sp: rnd(), p: rnd() };
      const A = new CPU(m1, { port: { dir: 0x2F, data: 0x35 }, io: IO, strict: true });
      const B = SRSim.cpu(m2, {});
      for (const C of [A, B]) { C.a = r.a; C.x = r.x; C.y = r.y; C.sp = r.sp; C.p = r.p; C.pc = pc; }
      let ea = '', eb = '';
      try { A.step(); } catch (e) { ea = e.message; }
      try { B.step(); } catch (e) { eb = e.message; }
      if (/chips|port/.test(eb)) continue;                                    // the page stops where the engine never goes
      if (op === 0x00 || ea) { if (!eb) fail('opcode', op.toString(16), 'ran on the page:', ea || 'BRK'); break; }
      if (eb) { fail('opcode', op.toString(16), 'stopped the page:', eb); break; }
      DOC.add(op); cases++;
      m1[0] = m2[0]; m1[1] = m2[1];                                           // the kit's port, not RAM
      const ra = [A.a, A.x, A.y, A.sp, A.p & 0xEF, A.pc].join(), rb = [B.a, B.x, B.y, B.sp, B.p & 0xEF, B.pc].join();
      if (ra !== rb || Buffer.compare(m1, m2)) { fail('opcode', op.toString(16), 'kit', ra, 'page', rb); break; }
    }
  }
  if (DOC.size !== 150) fail(DOC.size, 'opcodes agree, not 150');
  var opcodeCases = cases;
}

// ---- a fight in the kit's simulator, set up as SRSim.fight sets it up; it also records the passes a
// ship changes tactic on, which the page samples only every 8 passes
function kit(lineup, o) {
  const m = new Uint8Array(RAM);
  for (let i = 0x4000; i < 0x6400; i++) m[i] = rnd();                        // the display buffer
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: IO, strict: true });
  const rd24 = q => { let r = m[q] | m[q + 1] << 8 | m[q + 2] << 16; if (r & 0x800000) r -= 1 << 24; return r; };
  const logv = q => { const w = m[q + 1] << 24 >> 24; if (w < -10) return 0; const r = 2 ** (w + m[q] / 256); return m[q + 2] & 0x80 ? -r : r; };
  const F = { passes: 0, tracks: [], events: [], over: -1, end: '', turns: [], m };
  const gen = new Array(20).fill(0), was = {}, open = {};
  let launcher = -1;
  const hooks = {
    // load_file: a model's bytes from the page, then on past the call; any other file ends the fight
    0x1CBB: c => { const at = c.x | c.y << 8, name = String.fromCharCode(m[at], m[at + 1], m[at + 2]).toUpperCase();
      m.set(Buffer.from(MODELS[name], 'base64'), m[0x80] | m[0x81] << 8); c.pc = 0x1CBE; },
    0x1765: c => { const r = m[0x100 | ((c.sp + 1) & 255)] | m[0x100 | ((c.sp + 2) & 255)] << 8;
      F.end = r - 2 === 0x14E5 || r - 2 === 0x1B90 ? 'destroyed' : 'load $' + (r - 2).toString(16); return true; },
    0x0E02: c => { c.pc = 0x0E05; },                                          // do_key: no key
    0x1EAD: c => { launcher = c.y; },                                         // launch_missile
    0x1971: c => { gen[c.y]++; if (m[0x94] >= 9 && m[0x94] <= 11) F.events.push([F.passes, 'launch', launcher, c.y, m[0x94]]); },
    0x2222: c => { F.events.push([F.passes, 'beam', c.y, c.x, c.a & 7]); },  // beam_hit
    0x6BCD: () => { F.events.push([F.passes, 'ram', m[0xB2], m[0xB3]]); },  // ram, past the cooldowns
    0x6EA0: c => { F.events.push([F.passes, 'damage', c.x << 24 >> 24, c.y, m[0x80]]); },
    0x1A5F: c => { F.events.push([F.passes, 'destroyed', c.y, m[0x060D + c.y], c.a]); },
  };
  for (let k = 1; k < 20; k++) m[0x05F9 + k] = 0;                             // slot_in_use
  cpu.call(0x1D4A, {}, { hooks });                                            // reset_models
  m[0x077C] = 0; m[0x072E] = 0; m[0x0730] = 0; m[0x0731] = o.manchi ? 0xFE : 0;
  m[0x0726] = m[0x0727] = 0; m[0x0415] = 0; m.fill(0, 0x0545, 0x054E);
  if (o.seed) cpu.call(0xA2DC, { x: o.seed[0], y: o.seed[1] }, { hooks });
  for (const [type, ...p] of lineup) {
    p.forEach((q, k) => { const r = Math.round(q * 256) & 0xFFFFFF; m[0x6B + 3 * k] = r & 255; m[0x6C + 3 * k] = r >> 8 & 255; m[0x6D + 3 * k] = r >> 16; });
    m[0x74] = 0x6B; m[0x75] = 0x00;
    cpu.call(0x1949, { x: type }, { hooks });
  }
  function sample() {
    for (let k = 0; k < 20; k++) {
      const key = k + ':' + gen[k], t = m[0x060D + k];
      if (!m[0x05F9 + k] || t > 12) { delete open[k]; continue; }
      let tr = open[k];
      if (!tr || tr.key !== key) { tr = open[k] = { key, slot: k, type: t, from: F.passes / EVERY, samples: [] }; F.tracks.push(tr); }
      const s = { p: [0, 1, 2].map(q => Math.round(rd24(0x065D + 9 * k + 3 * q) / 64) / 4) };
      if (t < 9 || t > 11) {
        const o2 = 0x044B + 27 * k;
        const [a, b] = [0, 1].map(r => [0, 1, 2].map(q => Math.max(-127, Math.min(127, Math.round(127 * logv(o2 + 9 * r + 3 * q)))) / 127));
        s.r = [a, b, [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]];
        s.arm = m[0x051D + 2 * k] | m[0x051E + 2 * k] << 8; s.tac = m[0x043F + k]; s.st = m[0x041B + k]; s.tg = m[0x0445 + k];
      }
      tr.samples.push(s);
    }
  }
  function enemies() {
    const f = [];
    for (let k = 1; k < 20; k++) if (m[0x05F9 + k]) { const t = m[0x060D + k]; if (t >= 9 && t <= 11) return true; if (t <= 12) f.push(m[0x0C1E + t]); }
    for (const p of f) if (m[0x072E + p] >= 0xFE) return true;
    for (const p of f) for (const q of f) if (m[0x38B1 + 4 * p + q] >= 0xFE) return true;
    return false;
  }
  sample();
  hooks[0x0DED] = () => {
    for (let s = 1; s < 6; s++) {                                             // the pass just run: did a ship change tactic?
      if (!m[0x05F9 + s]) { delete was[s]; continue; }
      const key = s + ':' + gen[s] + ':' + m[0x060D + s];
      if (was[s] && was[s].key === key && was[s].tac !== m[0x043F + s]) F.turns.push(F.passes - 1);
      was[s] = { key, tac: m[0x043F + s] };
    }
  };
  hooks[0x0E08] = c => {                                                      // frame_skip3: the pass ends before the drawing
    F.passes++; c.pc = 0x0DED;
    if (F.passes % EVERY === 0) sample();
    if (F.over < 0 && !enemies()) F.over = F.passes;
    if (F.over >= 0 && F.passes >= F.over + 64) F.end = 'over'; else if (F.passes >= CAP) F.end = 'time';
    return !!F.end;
  };
  cpu.call(0x0DED, {}, { hooks, maxSteps: 4e9 });
  return F;
}

// ---- the same fight on the page, on only the bytes ships.html embeds
const carried = new Uint8Array(0x10000), PAGE = new Uint8Array(0x10000);
for (const [file, L] of [['parts/engine/listing.json', ENGINE], ['parts/flight/listing.json', FLIGHT]]) {
  const tag = page.match(new RegExp('data-listing="' + file.replace(/[./]/g, '\\$&') + '">(\\[.*?\\])</script>'));
  if (!tag) { fail('ships.html embeds nothing of', file); continue; }
  for (const piece of JSON.parse(tag[1])) {
    const [a, b] = piece.slice(1).split('-$').map(x => parseInt(x, 16));
    for (let x = a; x <= b; x++) if (L.has[x]) { carried[x] = 1; PAGE[x] = L.ram[x]; }
  }
}
carried.fill(1, 0x4000, 0x6400);                                              // the display buffer, empty
function onPage(lineup, o) {
  const F = SRSim.fight(PAGE, carried, MODELS, lineup, Object.assign({ passes: CAP }, o));
  while (F.pass()) ;
  return F;
}

const rec = F => JSON.stringify([F.tracks.map(t => [t.slot, t.type, t.from, t.samples]), F.events, F.over, F.end, F.passes]);
const FIGHTS = [
  { name: 'the opening fight', types: [3, 12, 1, 4], o: {} },
  { name: 'the opening fight with the Manchi attacking', types: [3, 12, 1, 4], o: { manchi: true } },
  { name: 'five ships', types: [1, 2, 3, 4, 5], o: { seed: [1, 1] } },
  { name: 'a Titan and four fighters', types: [6, 12, 2, 5, 4], o: { seed: [77, 3], manchi: true } },
  { name: 'merchants and pirates', types: [2, 5, 7, 8], o: { seed: [1, 2] } },
];
const runs = {};
for (const f of FIGHTS) {
  const lineup = SRSim.place(RAM, f.types);
  let P;
  try { P = onPage(lineup, f.o); } catch (e) { fail(f.name, 'stopped on the page:', e.message); continue; }
  const K = kit(lineup, f.o);
  runs[f.name] = { P, K, lineup };
  if (rec(P) !== rec(K)) { fail(f.name, 'differs: the page', P.end, P.passes, 'the kit', K.end, K.passes); continue; }
  for (let a = 0; a < 0x10000; a++)
    if (P.known[a] && (a < 0x4000 || a >= 0x6400) && a > 1 && (a & 0xF000) !== 0xD000 && P.m[a] !== K.m[a]) { fail(f.name, 'leaves $' + a.toString(16), P.m[a], 'on the page,', K.m[a], 'in the kit'); break; }
}

// ---- what the section says of them
const slotOf = (F, t) => F.tracks.find(tr => tr.type === t && tr.from === 0).slot;
const open = runs['the opening fight'], manchi = runs['the opening fight with the Manchi attacking'];
if (open) {
  const F = open.K, cr = slotOf(F, 3), hu = slotOf(F, 12);
  if (!F.events.some(e => e[0] === 256 && e[1] === 'ram' && [e[2], e[3]].sort().join() === [cr, hu].sort().join())) fail('the Cruiser and the Hunter do not collide on pass 256');
  // the computer pilots think on one pass in 17: beams, and changes of tactic, on passes 17 apart
  const ticks = F.events.filter(e => e[1] === 'beam').map(e => e[0] % 17), tacs = F.turns.map(p => p % 17);
  if (new Set(ticks).size !== 1) fail('beams fired on passes that are not 17 apart:', ticks.join(' '));
  if (new Set(tacs).size !== 1 || tacs[0] !== ticks[0]) fail('tactics changed on passes that are not 17 apart:', F.turns.join(' '));
  if (F.events.some(e => e[1] === 'beam' && e[3] === 0)) fail('a ship shot at the Sunracer with the Manchi neutral');
}
if (manchi) {
  const F = manchi.K, at = new Set(F.events.filter(e => e[1] === 'beam' && e[3] === 0).map(e => F.tracks.find(t => t.slot === e[2] && t.from === 0).type));
  if ([...at].sort().join() !== '1,4') fail('with the Manchi attacking, the Sunracer is shot at by types', [...at].join(' '), 'not the Wasp and the Vulture');
}
for (const [name, { K }] of Object.entries(runs)) {
  const ships = K.tracks.filter(t => t.from === 0 && t.slot > 0).length;
  const kill = (K.events.find(e => e[1] === 'destroyed') || [Infinity])[0], launch = K.events.find(e => e[1] === 'launch');
  if (ships === 5 && launch && launch[0] < kill) fail(name, ': a missile launched on pass', launch[0], 'with five ships and none destroyed');
}
if (!Object.values(runs).some(({ K }) => K.tracks.filter(t => t.from === 0 && t.slot > 0).length === 5 && K.events.some(e => e[1] === 'launch'))) fail('no fight of five ships launches a missile');
// a Manchi ship on its own destroys the Sunracer; ships of one faction are over at once; the engine
// makes no more than five ships, the most the builder takes
{
  const F = onPage(SRSim.place(RAM, [1]), { manchi: true });
  if (F.end !== 'destroyed') fail('a Wasp attacking the Sunracer ends', F.end, 'on pass', F.passes);
  const G = onPage(SRSim.place(RAM, [2, 5]), {});
  if (G.over !== 1) fail('a Dart and a Corsair are over on pass', G.over);
  const H = SRSim.fight(PAGE, carried, MODELS, SRSim.place(RAM, [1, 2, 3, 4, 5, 6, 7]), {});
  const made = H.tracks.filter(t => t.slot > 0).length, max = +(page.match(/const MAX = (\d+)/) || [])[1];
  if (made !== 5 || max !== 5) fail('the engine made', made, 'of seven ships; the builder takes', max);
}

// ---- the flight the section describes, on the engine: one pass of turn_objects ($7634) with a turn
// rate of 1 turns the player 1/1024 of a turn and a computer ship its type's step; one pass of
// apply_thrust ($74D3) from a standstill toward speed 70 gives a computer ship its type's gain
{
  const logv = (m, a) => { const w = m[a + 1] << 24 >> 24; if (w < -10) return 0; const v = 2 ** (w + m[a] / 256); return m[a + 2] & 0x80 ? -v : v; };
  const rd24 = (m, a) => { let v = m[a] | m[a + 1] << 8 | m[a + 2] << 16; if (v & 0x800000) v -= 1 << 24; return v / 256; };
  const setup = t => {
    const m = new Uint8Array(RAM), cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: IO, strict: true });
    for (let s = 1; s < 20; s++) m[0x05F9 + s] = 0;
    m.fill(0, 0x0508, 0x051D);                                                // every slot's rates
    if (t !== undefined) { m[0x05FA] = 1; m[0x060E] = t; m.copyWithin(0x044B + 27, 0x044B, 0x044B + 27); m.fill(0, 0x0545 + 9, 0x0545 + 18); m[0x040A] = 0; }
    return { m, cpu };
  };
  const moved = (m, s, run) => { const a = [0, 1, 2].map(i => logv(m, 0x044B + 27 * s + i * 3)); run();
    return Math.hypot(...[0, 1, 2].map(i => logv(m, 0x044B + 27 * s + i * 3) - a[i])) * 1024 / (2 * Math.PI); };
  { const { m, cpu } = setup(); m[0x0516] = 1;
    const k = moved(m, 0, () => cpu.call(0x7634, {}, {}));
    if (Math.abs(k - 1) > 0.01) fail('a turn rate of 1 turned the player', k.toFixed(3), '1024ths of a turn'); }
  for (const t of [1, 2, 3, 4, 5, 6, 7, 8, 12]) {
    const st = SRShips.stats(RAM, t);
    { const { m, cpu } = setup(t); m[0x0517] = 1;
      const k = moved(m, 1, () => cpu.call(0x7634, {}, {}));
      if (Math.abs(k / st.turn - 1) > 0.01) fail('type', t, 'turned', k.toFixed(3), 'the page says', st.turn.toFixed(3)); }
    { const { m, cpu } = setup(t); m[0x0416] = 70;
      cpu.call(0x74D3, {}, {});
      const v = Math.hypot(...[0, 1, 2].map(i => rd24(m, 0x0545 + 9 + 3 * i)));
      if (v !== st.gain) fail('type', t, 'gained', v, 'units a pass, the page says', st.gain); }
  }
}

if (bad) { console.log(bad + ' differ'); process.exit(1); }
const passes = Object.values(runs).reduce((s, r) => s + r.K.passes, 0);
console.log(`test_combat: the page's 6502 agrees with the kit's on ${DOC.size} opcodes (${opcodeCases} cases); ${FIGHTS.length} fights, ` +
            `${passes} passes, agree sample for sample on the bytes ships.html carries; the turns and thrust of 9 ship types agree with the engine's`);
