#!/usr/bin/env node
// Hold the theme on the How it works tab against the game. The page's themeSteps reads PROCsnd1's DATA
// from each part's committed listing: 103 steps, 52 notes each followed by a rest, the same in both
// parts, and the lengths 4, 9, 14, 19 and 30 played for 2, 6, 9, 12 and 20 twentieths. The page's
// recording of the chip (TUNES.theme), decoded by site/lib/sn76489.js, must then have 52 notes on each
// channel, channel 2's in the DATA's order (the same pitch for the same n, a higher one for a higher n)
// and as long as the DATA says, less the gap; and channel 1, flushed, must start each of its notes
// no later than channel 2 starts the same one, and from the fifth on, 0.5 to 1.2 seconds before it.
//   node games/bbc/grannys-garden/test_theme.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const { themeSteps } = g.run('index.html', 'ports', 'themeSteps');
const { TUNES } = g.run('index.html', 'data', 'TUNES');
g.lib('sn76489');

let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('THEME', ...what); };
const P1 = g.listing('parts/part-1/listing.json'), P2 = g.listing('parts/part-2/listing.json');
const s1 = themeSteps(P1.ram, P1.sym('tune_data')), s2 = themeSteps(P2.ram, P2.sym('tune_data'));
if (s1.length !== 103) fail(`Part 1: ${s1.length} steps, not 103`);
if (JSON.stringify(s1.map(s => [s.n, s.t])) !== JSON.stringify(s2.map(s => [s.n, s.t]))) fail('the two parts\' themes differ');
const notes = s1.filter(s => s.n > 0);
if (notes.length !== 52) fail(`${notes.length} notes, not 52`);
s1.forEach((s, i) => { if ((i % 2 === 0) !== (s.n > 0)) fail(`step ${i + 1} is ${s.n ? 'a note' : 'a rest'} out of turn`); });
const LEN = { 4: 2, 9: 6, 14: 9, 19: 12, 30: 20 };
for (const s of notes) if (LEN[s.t] !== s.len) fail(`length ${s.t} plays for ${s.len}, not ${LEN[s.t]}`);

const rec = BBCSound.notes(TUNES.theme), ch = c => rec.filter(n => n.ch === c);
for (const c of [0, 1, 2]) if (ch(c).length !== 52) fail(`the recording has ${ch(c).length} notes on tone ${c}, not 52`);
const two = ch(1), one = ch(2);
const byN = new Map();
notes.forEach((s, i) => {
  const r = two[i];
  if (!r) return;
  if (byN.has(s.n) && byN.get(s.n) !== r.n) fail(`note ${i + 1}: pitch ${s.n} recorded as N=${r.n}, earlier as N=${byN.get(s.n)}`);
  byN.set(s.n, r.n);
  if (Math.abs(r.dur - s.len / 20) > 0.02) fail(`note ${i + 1}: ${r.dur.toFixed(3)} s on channel 2, the DATA says ${s.len}/20`);
  if (one[i] && one[i].t > r.t + 0.005) fail(`note ${i + 1}: channel 1 starts at ${one[i].t.toFixed(3)} s, after channel 2's ${r.t.toFixed(3)} s`);
});
const ns = [...byN.keys()].sort((a, b) => a - b);
for (let i = 1; i < ns.length; i++) if (!(byN.get(ns[i]) < byN.get(ns[i - 1]))) fail(`pitch ${ns[i]} is not higher than pitch ${ns[i - 1]} in the recording`);
const lead = one.map((n, i) => two[i].t - n.t);
lead.slice(4).forEach((l, i) => { if (l < 0.4 || l > 1.2) fail(`note ${i + 5}: channel 1 leads by ${l.toFixed(2)} s, outside the 0.5-1.2 s facts.md gives`); });
console.log(`theme: ${s1.length} steps, ${notes.length} notes; channel 1 leads channel 2 by ${Math.min(...lead).toFixed(2)}-${Math.max(...lead).toFixed(2)} s`);
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log('all passed');
