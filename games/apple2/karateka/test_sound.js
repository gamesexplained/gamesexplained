#!/usr/bin/env node
// Hold reference/sound.js, the Sound section's effects, to the game. Each sound calls the engine's
// own routine from the committed listing on the kit's 6502, as the page does, and every spacing
// between two clicks of the speaker must be what the game made in Apple2TS when the same routine was
// called there from the engine's snapshot, until it returned (work/verify/sound_live.py, 24 October
// 2026; facts.md, "Live tests"). LIVE below is that recording: for the seven effects, the cycles
// between one click and the next, a run of n equal spacings written [cycles, n]; for the recorded
// sound, 743 clicks at each speed, the number of clicks and the SHA-256 of the spacings written out
// with commas. It exits 1 on any difference.
//   node games/apple2/karateka/test_sound.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502'); g.lib('apple2');
const { KarSound } = g.run('reference/sound.js', 'sound.js', 'KarSound');
const L = g.listing('parts/engine/listing.json');
const LIVE = {
  'The hero struck': [63, 89, 120, 156, 197, 243, 294, 350, 411, 477, 548, 624, 705, 791, 882, 978, 1079, 1185, 1296, 1412, 1533, 1659, 1790, 1926, 2067, 2213, 2364, 2520, 2681, 2847, 3018, 3194, 3375, 3561, 3752, 3948, 4149],
  'The opponent struck': [65, 122, 199, 296, 413, 550, 707, 884, 1081, 1298, 1535, 1792, 2069, 2366, 2683, 3020, 3377, 3754, 4151, 4568, 5005, 5462, 5939, 6436, 6953, 7490, 8047],
  'A quick punch lands': [65, 122, 199, 296, 413, 550, 707, 884, 1081, 1298, 1535, 1792, 2069, 2366, 2683, 3020],
  'A blow thrown': [[154, 9]],
  'A control key': [[409, 15]],
  'A step, in a scene': [884, 296, 122],
  'A step': [[880, 2]],
  'Recorded, speed 30': { clicks: 743, sha: '5ef3a4c1c899127f' },
  'Recorded, speed 40': { clicks: 743, sha: '9a7b6232a1eaf391' },
  'Recorded, speed 18': { clicks: 743, sha: 'c297fb4ef0d96e22' },
};
let bad = 0;
const fail = (...w) => { bad++; console.log('DIFFERS', ...w); };
const flat = runs => runs.flatMap(r => Array.isArray(r) ? Array(r[1]).fill(r[0]) : [r]);
if (KarSound.EFFECTS.length !== Object.keys(LIVE).length) fail('sounds', KarSound.EFFECTS.length, 'recorded', Object.keys(LIVE).length);
KarSound.EFFECTS.forEach((e, k) => {
  const want = LIVE[e.name];
  if (!want) { fail(e.name, 'was not recorded live'); return; }
  const log = KarSound.log(L, k), s = log.speaker, got = s.slice(1).map((c, i) => c - s[i]);
  if (!(log.end > s[s.length - 1])) fail(e.name, 'ends before its last click');
  if (!Array.isArray(want)) {
    const sha = crypto.createHash('sha256').update(got.join(',')).digest('hex').slice(0, 16);
    if (s.length !== want.clicks || sha !== want.sha) fail(e.name, s.length, 'clicks', sha, '; live', want.clicks, want.sha);
    return;
  }
  const live = flat(want);
  if (got.length !== live.length) { fail(e.name, got.length + 1, 'clicks, live', live.length + 1); return; }
  const i = got.findIndex((v, j) => v !== live[j]);
  if (i >= 0) fail(e.name, 'spacing', i, 'is', got[i], 'cycles, live', live[i]);
});
if (bad) { console.log(bad + ' differ'); process.exit(1); }
console.log('test_sound: all ' + KarSound.EFFECTS.length + ' sounds click as the game did in Apple2TS');
