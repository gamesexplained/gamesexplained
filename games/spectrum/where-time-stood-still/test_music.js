'use strict';
// The tunes and sound effects the How it works page plays: the game's own sound driver ($7000,
// from parts/main/listing.json) run on the kit's Z80 once a call, as the interrupt calls it, and
// what it writes to the AY and the beeper recorded, call by call. The page embeds the recordings
// (packed by site/lib/ay.js) in <script id="wtss-sound">; this test makes them again from the
// listing and fails if the page's differ, so the page plays what the listing's bytes play.
// node games/spectrum/where-time-stood-still/test_music.js [--write]   (--write updates the page)
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..', '..');
const { CPU } = require(path.join(ROOT, 'kit', 'spectrum', 'z80.js'));
require(path.join(ROOT, 'site', 'lib', 'ay.js'));
const AY = globalThis.SpectrumAY;
const L = JSON.parse(fs.readFileSync(path.join(__dirname, 'parts', 'main', 'listing.json')));

function memory() {
  const m = new Uint8Array(0x10000);
  for (const r of L.records) if (r.b) m.set(r.b, r.a);
  return m;
}

// `calls` runs of the driver after tune `tune` is requested at $7002. Each call starts at $7000
// with a return address of $0000, and ends when it returns there; port $FFFD selects a register,
// $BFFD writes it, and an even port is the ULA's, whose bit 4 is the beeper. poke(k, m) runs
// before call k. Returns the calls' writes and, for each call, the section it ran ($7115).
function run(tune, calls, poke) {
  const m = memory();
  let sel = 0, ear = -1, cur;
  const cpu = new CPU(m, { io: {
    out(port, v) {
      if ((port & 0xC002) === 0xC000) sel = v & 15;
      else if ((port & 0xC002) === 0x8000) cur.push(sel, v);
      else if (!(port & 1)) { const e = v >> 4 & 1; if (e !== ear) { cur.push(16, e); ear = e; } }
      else throw new Error('out to port ' + port.toString(16));
    },
    in(port) { throw new Error('in from port ' + port.toString(16)); } } });
  m[0x7002] = tune;
  const out = [], section = [];
  for (let k = 0; k < calls; k++) {
    if (poke) poke(k, m);
    cur = [];
    cpu.setRegs({ pc: 0x7000, sp: 0x5FF0 });
    m[0x5FF0] = 0; m[0x5FF1] = 0;
    for (let n = 0; cpu.pc !== 0; n++) {
      if (cpu.pc < 0x7000 || cpu.pc > 0x7B67 || n > 200000) throw new Error(`call ${k} left the driver at ${cpu.pc.toString(16)}`);
      cpu.step();
    }
    out.push(cur);
    section.push(m[0x7115]);
  }
  return { calls: out, section, m };
}

const log = calls => AY.pack({ clock: AY.CLOCK, hz: AY.HZ, calls });
// [first call, section, its handler from the table at $70BF] wherever the section changes
function sections(r, from, to) {
  const out = [];
  for (let k = from; k < to; k++) {
    const s = r.section[k];
    if (!out.length || out[out.length - 1][1] !== s) out.push([k - from, s, r.m[0x70BF + 2 * s] | r.m[0x70C0 + 2 * s] << 8]);
  }
  return out;
}

function build() {
  // Tune 14 is the music: calls 2 to 3844 are its first time round, and from 3845 it loops
  // through sections 14 to 26 again with the transposition section 23 left at 1.
  const t14 = run(14, 7688), t1 = run(1, 3845);
  const tunes = [
    { id: 'title', log: log(t14.calls.slice(0, 3845)), sections: sections(t14, 0, 3845) },
    { id: 'title-again', log: log(t14.calls.slice(3845, 7688)), sections: sections(t14, 3845, 7688) },
    { id: 'second', log: log(t1.calls.slice(0, 3845)), sections: sections(t1, 0, 3845) },
  ];
  // Sound-effects mode is tune 4: an effect number in a channel's +3 byte ($7006, $701F or
  // $7038) starts it at the next call. Each is played on the channel the game asks for it on
  // (channel A for those it never asks for), from that call until its last sound.
  const CHANNEL = { 2: 2, 3: 0, 4: 1, 5: 0, 7: 1, 8: 1, 9: 0, 0x0A: 2, 0x0B: 2, 0x0E: 0, 0x0F: 0, 0x10: 0, 0x11: 2, 0x12: 1, 0x17: 0 };
  const effects = [];
  for (let e = 1; e < 24; e++) {
    const ch = CHANNEL[e] || 0;
    const r = run(4, 153, (k, m) => { if (k === 3) m[0x7006 + 0x19 * ch] = e; });
    const st = AY.decode({ clock: AY.CLOCK, hz: AY.HZ, calls: r.calls });
    let last = -1;
    st.forEach((s, k) => { if (k >= 3 && s.vol.some(v => v > 0)) last = k; });
    if (last < 0) { effects.push({ n: e, ch, log: null }); continue; }
    effects.push({ n: e, ch, log: log(r.calls.slice(3, Math.min(last + 2, 153))) });
  }
  return { tunes, effects };
}

const PAGE = path.join(__dirname, 'index.html');
const RE = /(<script type="application\/json" id="wtss-sound">)([\s\S]*?)(<\/script>)/;
const want = build();
const html = fs.readFileSync(PAGE, 'utf8');
const m = html.match(RE);
if (process.argv.includes('--write')) {
  if (!m) { console.log('FAIL index.html has no <script type="application/json" id="wtss-sound">'); process.exit(1); }
  fs.writeFileSync(PAGE, html.replace(RE, (_, a, b, c) => a + JSON.stringify(want) + c));
  console.log('wrote', JSON.stringify(want).length, 'bytes into index.html');
  process.exit(0);
}
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };
check(!!m, 'index.html embeds the recordings');
if (m) {
  const got = JSON.parse(m[2]);
  for (const t of want.tunes) {
    const g = got.tunes.find(x => x.id === t.id);
    check(g && JSON.stringify(g) === JSON.stringify(t), `tune "${t.id}": the page's ${g ? g.log.n : 0} calls are the driver's ${t.log.n}`);
  }
  const same = want.effects.filter(e => JSON.stringify(got.effects.find(x => x.n === e.n)) === JSON.stringify(e)).length;
  check(same === want.effects.length, `the ${want.effects.length} sound effects: ${same} the same as the driver's`);
}
// What the page says about the music, checked against the recordings
const st1 = AY.decode(AY.unpack(want.tunes[0].log)), st2 = AY.decode(AY.unpack(want.tunes[1].log));
let up = 0, same = 0;
for (let k = 400; k < 1200; k++) for (let ch = 0; ch < 3; ch++) {
  if (!st1[k + 2].vol[ch]) continue;
  const d = 12 * Math.log2(st1[k + 2].tone[ch] / st2[k].tone[ch]);
  if (Math.abs(d - 1) < 0.1) up++; else if (Math.abs(d) < 0.1) same++;
}
check(up > 10 * same, `sections 16 and 17 play a semitone higher the second time round (${up} channel-calls up, ${same} the same)`);
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
