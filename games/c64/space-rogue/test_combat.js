'use strict';
// Holds Combat's replay (the sr-fight recording on How it works) to the engine. The fight is the
// engine's own main loop ($0DED) run in the kit's 6502 simulator on the committed engine and flight
// listings: every slot but the player's emptied, the danger level 0 so that no ship arrives, the
// player still and neutral to the pirates and the Imperium (the Manchi are hostile to everyone), and
// four ships created where the recording's line-up puts them (create_object, $1949; their models
// from the page's sr-models, through load_model's own relocation). Each pass runs everything the loop calls before its drawing, with no key pressed; the
// drawing is skipped as frame_skip3 ($A470) skips it when a pass runs late. The test runs it again
// and compares every sample and every event with the page's, decoded by the page's own sr-fight.
//   node test_combat.js            the test
//   node test_combat.js --print    the recording, as the page embeds it
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/c64/cpu6502.js'));
const g = game(__dirname);
const page = g.read('index.html');
const MODELS = JSON.parse(page.match(/<script type="application\/json" id="sr-models">([^<]*)<\/script>/)[1]);
// The line-up, an Imperial Cruiser and Hunter against a Manchi Wasp and Vulture: type, then x, y
// and z in the engine's units; the player is at (0, 0, -99.6)
const LINEUP = [[3, 0, 0, -500], [12, 80, -40, -450], [1, 250, 60, -750], [4, -200, -60, -800]];
const PASSES = 2000, EVERY = 8;

function fight() {
  const m = new Uint8Array(g.listing('parts/engine/listing.json').ram);
  m.set(g.listing('parts/flight/listing.json').ram.subarray(0xA500, 0xBD00), 0xA500);   // SEG0's maths
  const io = { read(a, c) { throw new Error('I/O read $' + a.toString(16) + ' at $' + c.pc.toString(16)); },
               write() {} };   // the sound and the border the loop sets; nothing reads them back
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io, strict: true });
  const rd24 = a => { let v = m[a] | m[a + 1] << 8 | m[a + 2] << 16; if (v & 0x800000) v -= 1 << 24; return v; };
  const logv = a => { const w = m[a + 1] << 24 >> 24; if (w < -10) return 0; const v = 2 ** (w + m[a] / 256); return m[a + 2] & 0x80 ? -v : v; };
  const events = [], gen = new Array(20).fill(0);
  let pass = 0, launcher = -1;
  const hooks = {
    // load_file, called by load_model: the model's bytes from the page, then on past the call
    0x1CBB: c => {
      const name = String.fromCharCode(...m.subarray(c.x | c.y << 8, (c.x | c.y << 8) + 3)).toUpperCase();
      m.set(Buffer.from(MODELS[name], 'base64'), m[0x80] | m[0x81] << 8); c.pc = 0x1CBE;
    },
    0x1765: c => { throw new Error('load_file from $' + c.pc.toString(16)); },
    0x0E02: c => { c.pc = 0x0E05; },                 // do_key: no key
    0x0E08: c => { pass++; c.pc = 0x0DED; },         // frame_skip3: the pass ends before the drawing
    0x1EAD: c => { launcher = c.y; },                // launch_missile
    0x1971: c => {                                   // fill_slot: slot Y, the type in $94
      gen[c.y]++;
      if (m[0x94] >= 9 && m[0x94] <= 11) events.push([pass, 'launch', launcher, c.y, m[0x94]]);
    },
    0x2222: c => { events.push([pass, 'beam', c.y, c.x, c.a & 7]); },              // beam_hit
    0x6BCD: () => { events.push([pass, 'ram', m[0xB2], m[0xB3]]); },              // ram, past the cooldowns
    0x6EA0: c => { events.push([pass, 'damage', c.x << 24 >> 24, c.y, m[0x80]]); }, // damage
    0x1A5F: c => { events.push([pass, 'destroyed', c.y, m[0x60D + c.y], c.a]); },     // destroy_object: A the killer
  };
  for (let s = 1; s < 20; s++) m[0x05F9 + s] = 0;   // slot_in_use
  cpu.call(0x1D4A, {}, {});                         // reset_models
  m[0x077C] = 0;                                    // danger
  m[0x072E] = 0; m[0x0730] = 0;                     // neutral to the pirates and the Imperium
  m[0x0726] = m[0x0727] = 0;                        // no bounty
  m[0x0415] = 0; m.fill(0, 0x0545, 0x054E);         // the player's speed and velocity
  for (const [type, ...at] of LINEUP) {
    at.forEach((v, k) => { const n = Math.round(v * 256) & 0xFFFFFF; m[0x6B + 3 * k] = n & 255; m[0x6C + 3 * k] = n >> 8 & 255; m[0x6D + 3 * k] = n >> 16; });
    m[0x74] = 0x6B; m[0x75] = 0x00;
    cpu.call(0x1949, { x: type }, { hooks });
  }
  const player = [0, 1, 2].map(k => rd24(0x065D + 3 * k) / 256);
  const tracks = [], open = {}, was = {}, turns = [];
  hooks[0x0DED] = () => {
    for (let s = 1; s < 6; s++) {                    // every pass: the passes a ship changes tactic on
      const key = s + ':' + gen[s] + ':' + m[0x060D + s];
      if (!m[0x05F9 + s]) { delete was[s]; continue; }
      if (was[s] && was[s].key === key && was[s].tac !== m[0x043F + s]) turns.push(pass - 1);   // the pass just run
      was[s] = { key, tac: m[0x043F + s] };
    }
    if (pass % EVERY === 0) {
      const k = pass / EVERY;
      for (let s = 0; s < 6; s++) {
        const key = s + ':' + gen[s];
        if (!m[0x05F9 + s]) { delete open[s]; continue; }
        let t = open[s];
        if (!t || t.key !== key) {
          t = open[s] = { key, slot: s, type: m[0x060D + s], from: k, raw: [] };
          tracks.push(t);
        }
        const q = [0, 1, 2].map(i => Math.round(rd24(0x065D + 9 * s + 3 * i) / 64));    // quarter units
        if (t.type < 9 || t.type > 11) {
          const o = 0x044B + 27 * s;
          for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) q.push(Math.max(-127, Math.min(127, Math.round(127 * logv(o + 9 * r + 3 * i)))));
          q.push(m[0x051D + 2 * s] | m[0x051E + 2 * s] << 8, m[0x043F + s], m[0x041B + s], m[0x0445 + s]);
        }
        t.raw.push(q);
      }
    }
    return pass >= PASSES;
  };
  cpu.call(0x0DED, {}, { hooks, maxSteps: 1e9 });
  return { player, tracks, events, turns };
}

// The flight the section describes, on the engine: one pass of turn_objects ($7634) with a turn
// rate of 1 turns the player 1/1024 of a turn and a computer ship its type's step; one pass of
// apply_thrust ($74D3) from a standstill toward speed 70 gives a computer ship its type's gain
function flight(SRShips, fail) {
  const base = new Uint8Array(g.listing('parts/engine/listing.json').ram);
  base.set(g.listing('parts/flight/listing.json').ram.subarray(0xA500, 0xBD00), 0xA500);
  const logv = (m, a) => { const w = m[a + 1] << 24 >> 24; if (w < -10) return 0; const v = 2 ** (w + m[a] / 256); return m[a + 2] & 0x80 ? -v : v; };
  const rd24 = (m, a) => { let v = m[a] | m[a + 1] << 8 | m[a + 2] << 16; if (v & 0x800000) v -= 1 << 24; return v / 256; };
  const setup = t => {
    const m = new Uint8Array(base), cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { read() { throw new Error('I/O read'); }, write() {} }, strict: true });
    for (let s = 1; s < 20; s++) m[0x05F9 + s] = 0;
    m.fill(0, 0x0508, 0x051D);                                   // every slot's rates
    if (t !== undefined) { m[0x05FA] = 1; m[0x060E] = t; m.copyWithin(0x044B + 27, 0x044B, 0x044B + 27); m.fill(0, 0x0545 + 9, 0x0545 + 18); m[0x040A] = 0; }
    return { m, cpu };
  };
  const moved = (m, s, run) => { const a = [0, 1, 2].map(i => logv(m, 0x044B + 27 * s + i * 3)); run();
    return Math.hypot(...[0, 1, 2].map(i => logv(m, 0x044B + 27 * s + i * 3) - a[i])) * 1024 / (2 * Math.PI); };
  { const { m, cpu } = setup(); m[0x0516] = 1;
    const k = moved(m, 0, () => cpu.call(0x7634, {}, {}));
    if (Math.abs(k - 1) > 0.01) fail('a turn rate of 1 turned the player', k.toFixed(3), '1024ths of a turn'); }
  for (const t of [1, 2, 3, 4, 5, 6, 7, 8, 12]) {
    const st = SRShips.stats(base, t);
    { const { m, cpu } = setup(t); m[0x0517] = 1;
      const k = moved(m, 1, () => cpu.call(0x7634, {}, {}));
      if (Math.abs(k / st.turn - 1) > 0.01) fail('type', t, 'turned', k.toFixed(3), 'the page says', st.turn.toFixed(3)); }
    { const { m, cpu } = setup(t); m[0x0416] = 70;
      cpu.call(0x74D3, {}, {});
      const v = Math.hypot(...[0, 1, 2].map(i => rd24(m, 0x0545 + 9 + 3 * i)));
      if (v !== st.gain) fail('type', t, 'gained', v, 'units a pass, the page says', st.gain); }
  }
}

// A track's samples as the page holds them: x, y and z as 16-bit numbers in quarter units; for a
// ship, then its first two orientation rows times 127 as signed bytes, its hit points (16 bits),
// tactic, AI state and target
function pack(t) {
  const ship = t.type < 9 || t.type > 11, n = ship ? 17 : 6, b = Buffer.alloc(n * t.raw.length);
  t.raw.forEach((q, j) => {
    const o = j * n;
    for (let i = 0; i < 3; i++) b.writeInt16LE(q[i], o + 2 * i);
    if (!ship) return;
    for (let i = 0; i < 6; i++) b.writeInt8(q[3 + i], o + 6 + i);
    b.writeUInt16LE(q[9], o + 12); b[o + 14] = q[10]; b[o + 15] = q[11]; b[o + 16] = q[12];
  });
  return b.toString('base64');
}
const run = fight();
const rec = { passes: PASSES, every: EVERY, lineup: LINEUP, player: run.player,
              tracks: run.tracks.map(t => ({ slot: t.slot, type: t.type, from: t.from, d: pack(t) })), events: run.events };
if (process.argv.includes('--print')) { process.stdout.write(JSON.stringify(rec)); process.exit(0); }

let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const want = JSON.parse(page.match(/<script type="application\/json" id="sr-fight">([^<]*)<\/script>/)[1]);
for (const k of ['passes', 'every', 'lineup', 'player', 'events'])
  if (JSON.stringify(want[k]) !== JSON.stringify(rec[k])) fail(k, 'differs from the run');
if (want.tracks.length !== rec.tracks.length) fail('the page has', want.tracks.length, 'tracks, the run', rec.tracks.length);
const { SRFight } = g.run('index.html', 'sr-fight', 'SRFight');
const got = SRFight.decode(want);
run.tracks.forEach((t, i) => {
  const w = got.tracks[i];
  if (!w || w.slot !== t.slot || w.type !== t.type || w.from !== t.from || w.samples.length !== t.raw.length) { fail('track', i, 'slot', t.slot); return; }
  t.raw.forEach((q, j) => {
    const s = w.samples[j], v = [...s.p.map(x => Math.round(x * 4))];
    if (s.r) v.push(...s.r[0].map(x => Math.round(x * 127)), ...s.r[1].map(x => Math.round(x * 127)), s.arm, s.tac, s.st, s.tg);
    if (JSON.stringify(v) !== JSON.stringify(q)) fail('track', i, 'slot', t.slot, 'sample', j, JSON.stringify(v), JSON.stringify(q));
  });
});
// what the section says of the run: the ships fire their beams only on passes 17 apart
// and change tactics only on passes 17 apart
const ticks = run.events.filter(e => e[1] === 'beam').map(e => e[0] % 17), tacs = run.turns.map(p => p % 17);
if (new Set(ticks).size !== 1) fail('beams fired on passes that are not 17 apart:', ticks.join(' '));
if (new Set(tacs).size !== 1 || tacs[0] !== ticks[0]) fail('tactics changed on passes that are not 17 apart:', run.turns.join(' '));
flight(g.run('index.html', 'sr-ships', 'SRShips').SRShips, fail);
if (bad) { console.log(bad + ' differ'); process.exit(1); }
const shots = run.events.filter(e => e[1] === 'beam').length, launches = run.events.filter(e => e[1] === 'launch').length;
console.log(`test_combat: ${PASSES} passes of the engine's flight loop agree with the page: ${rec.tracks.length} tracks, ${shots} beam hits, ` +
            `${launches} missiles, ${run.turns.length} changes of tactic; the turns and thrust of 9 ship types agree with the engine's`);
