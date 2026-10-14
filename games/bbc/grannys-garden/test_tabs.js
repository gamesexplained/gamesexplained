#!/usr/bin/env node
// Hold the Solution and Maps tabs to the play-through they are drawn from. Both embed the same
// recording (PLAY, PLAY_SCREENS: every wait of one play-through in jsbeeb, 1,000 bytes of screen
// each). Every answer the Solution tab lists (ASKED, and the Answer column of its tables) must be
// what was typed at that search's waits, in order; every place on the Maps tab must be drawn from a
// screen that shows what the place's text says it does (MAPS[...].places[...].says).
//   node games/bbc/grannys-garden/test_tabs.js
const path = require('path'), zlib = require('zlib'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);

let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('TABS', ...what); };

const sol = g.run('solution.html', 'data', 'PLAY', 'PLAY_SCREENS', 'ASKED');
const maps = g.run('levels.html', 'data', 'PLAY', 'PLAY_SCREENS', 'MAPS');
const { PLAY, PLAY_SCREENS, ASKED } = sol;
globalThis.PLAY = PLAY;                  // the ports read it as the pages' global
globalThis.PLAY_SCREENS = PLAY_SCREENS;
const { typedFrames } = g.run('solution.html', 'ports', 'typedFrames');
const { frameOf } = g.run('levels.html', 'ports', 'frameOf');

if (JSON.stringify(maps.PLAY) !== JSON.stringify(PLAY) || maps.PLAY_SCREENS !== PLAY_SCREENS) fail('the two tabs embed different recordings');
const all = zlib.inflateSync(Buffer.from(PLAY_SCREENS, 'base64'));
if (all.length !== 1000 * PLAY.steps.length) fail(`${all.length} bytes of screens for ${PLAY.steps.length} waits`);
let next = 0;
for (const s of PLAY.seqs) { if (s.first !== next) fail(`${s.id} starts at ${s.first}, not ${next}`); next = s.first + s.n; }
if (next !== PLAY.steps.length) fail(`the searches cover ${next} of ${PLAY.steps.length} waits`);

// the answers
const html = g.read('solution.html');
for (const [sid, asked] of Object.entries(ASKED)) {
  const seq = PLAY.seqs.find(s => s.id === sid);
  if (!seq) { fail(`no search ${sid}`); continue; }
  const typed = typedFrames(seq).map(i => PLAY.steps[seq.first + i][2]);
  if (typed.join('|') !== asked.join('|')) fail(`${sid}: typed ${typed.join(' ')}, the page lists ${asked.join(' ')}`);
  const m = html.match(new RegExp(`data-seq="${sid}"[\\s\\S]*?<tbody>([\\s\\S]*?)</tbody>`));
  const column = m ? [...m[1].matchAll(/<td><kbd>(.*?)<\/kbd><\/td><\/tr>/g)].map(r => r[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : [];
  if (column.join('|') !== asked.join('|')) fail(`${sid}: the table's answers are ${column.join(' ')}`);
}

// the places: a screen's text is its printable bytes, with the spaces and control codes left out
const text = k => [...all.subarray(k * 1000, k * 1000 + 1000)].map(b => b & 0x7f).filter(b => b > 32 && b < 127).map(b => String.fromCharCode(b)).join('');
const flat = s => s.replace(/\s+/g, '');
const check = (where, p) => {
  const seq = PLAY.seqs.find(s => s.id === p.seen[0]);
  if (!seq || p.seen[1] < 0 || p.seen[1] >= seq.n) { fail(`${where}: no screen ${p.seen}`); return; }
  if (p.says && !text(frameOf(p)).includes(flat(p.says))) fail(`${where}: ${p.seen} does not show "${p.says}"`);
};
let n = 0;
for (const [id, M] of Object.entries(maps.MAPS)) {
  if (M.map) check(`${id} map`, M.map);
  for (const p of M.places) { check(`${id} ${p.id}`, p); n++; }
}
let roads = 0;
for (const m of g.read('levels.html').matchAll(/data-seen="(\w+),(\d+)" data-says="([^"]+)"/g)) { check(`the road ${m[1]}-${m[2]}`, { seen: [m[1], +m[2]], says: m[3] }); roads++; }
if (roads !== 7) fail(`${roads} roads with a screen, not 7`);   // all but the two sums of 3 and 7, where nothing happens

if (bad) { console.log(`TABS: ${bad} wrong`); process.exit(1); }
console.log(`TABS: ${Object.values(ASKED).flat().length} answers as typed, ${n} places and ${roads} roads on the screens they name`);
