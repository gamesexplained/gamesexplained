#!/usr/bin/env node
// Hold music.html's loading tune player (the blocks sc-loader-tune and sc-loader-data) to the
// cassette. The page runs the tune's own code on the kit's 6502 over the bytes in sc-loader-data:
// the RAM at $A000-$ACFA as VICE 3.10 (vice-mcp 3.14.0) held it on 11 November 2026 when the
// cassette, the Ultimate Tape Archive's "Short_Circuit.tap" (643,155 bytes, SHA-256
// 6b51138710fa6bf6b8842b6520d9e43412caad4f335f8eb8afe85e46535ed1f2), reached the code that starts
// the tune ($AD05). Its bytes, and the code that calls the tune ($AD05-$AD1F), are Arkanoid's
// cassette's (games/c64/arkanoid/test_loading_tune.js holds those): the volume set to 15, $A000
// called once and then $A04E once a frame.
// - The bytes: their hash, the same as Arkanoid's.
// - The sound: VICE stopped after each of the cassette's first 3,000 calls of $A04E and its SID
//   state was recorded. The registers after each of the page's first 3,000 calls must be those.
//   VICE reports the top nibble of the pulse width registers ($D403, $D40A, $D411) as 0, as the
//   chip ignores it, and reports $D418's bit 3 in $D417's place, so both are left out.
// - The loop the page gives sid.js: from call 2,305 the registers repeat every 12,672 calls.
// It exits 1 on any difference.
//   node games/c64/short-circuit/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createLoaderTune } = g.run('music.html', 'sc-loader-tune', 'createLoaderTune');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="sc-loader-data">([^<]*)<\/script>/.exec(g.read('music.html'));
if (!m) { console.log('music.html has no sc-loader-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
check('blocks', D.blocks.map(([a, s]) => a + ':' + Buffer.from(s, 'base64').length).join(), '40960:3323');
check('bytes $A000-$ACFA', sha(Buffer.from(D.blocks[0][1], 'base64')), 'a4271de0f5a6496e875e71c2b543fa1f9f2556cd3bfd125eb6e6971d789bf337');
check('start, play, volume', [D.init, D.play, JSON.stringify(D.before)].join(), '40960,41038,[[24,15]]');

const T = createLoaderTune(D, C64Cpu);
T.init(0);
const masked = (r) => Array.from(r, (v, i) => (i === 23 ? v & 0xF7 : i === 3 || i === 10 || i === 17 ? v & 0x0F : v));
const h = crypto.createHash('sha256'), states = [];
const N = 2305 + 2 * 12672;
for (let i = 1; i <= N; i++) {
  T.play();
  const r = masked(T.sid);
  if (i <= 3000) h.update(Buffer.from(r));
  states.push(r.join());
}
check('SID registers, 3,000 calls', h.digest('hex'), 'c37566ad9a4bbad7c6529edef5e8f5aea93fe18bf181e0576d9af473e1cacd9c');
let loopBad = 0;
for (let i = 2305; i + 12672 <= N; i++) if (states[i - 1] !== states[i - 1 + 12672]) loopBad++;
check('the registers repeat every 12,672 calls from call 2,305', loopBad, 0);
check('they do not repeat from call 2,304', states[2303] === states[2303 + 12672], false);

console.log(bad ? bad + ' difference(s)' : "short-circuit loading tune: the page's bytes are the cassette's, and its first 3,000 calls sound as VICE recorded them");
process.exit(bad ? 1 : 0);
