#!/usr/bin/env node
// Hold music.html's loading tune player (the blocks ak-loader-tune and ak-loader-data) to the
// cassette. The page runs the tune's own code on the kit's 6502 over the bytes in ak-loader-data:
// the RAM at $A000-$ACFA as VICE 3.10 (vice-mcp 3.14.0) held it on 11 November 2026 when the 1987
// cassette, the Ultimate Tape Archive's "Arkanoid.tap" (640,955 bytes, SHA-256
// d1f218962fa31396e580fdd390e256e92fd5dcadd0736550d71236ba2bc63a81), reached the code that starts
// the tune ($AD05), about 58.5 seconds into the tape. The cassette sets the volume to 15, calls
// $A000 once and then $A04E once a frame (its main loop waits for the raster interrupt's flag).
// - The bytes: their hash, and the tune reads and runs nothing outside them in 30,000 calls.
// - The sound: VICE stopped after each of the cassette's first 9,000 calls of $A04E and its SID
//   state was recorded. The registers after each of the page's first 9,000 calls must be those.
//   VICE reports the top nibble of the pulse width registers ($D403, $D40A, $D411) as 0, as the
//   chip ignores it, and reports $D418's bit 3 in $D417's place, so both are left out.
// - The loop the page gives sid.js: from call 2,305 the registers repeat every 12,672 calls, and
//   from call 7,425 so does the tune's whole state, so the sound repeats for as long as it plays.
// It exits 1 on any difference.
//   node games/c64/arkanoid/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createLoaderTune } = g.run('music.html', 'ak-loader-tune', 'createLoaderTune');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="ak-loader-data">([^<]*)<\/script>/.exec(g.read('music.html'));
if (!m) { console.log('music.html has no ak-loader-data block'); process.exit(1); }
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
  if (i <= 9000) h.update(Buffer.from(r));
  states.push(r.join());
}
check('SID registers, 9,000 calls', h.digest('hex'), 'ce9ae690e8ff86d17a64991d8f448c4dc76865d4998fd55af1c6d73cf23ca2fd');
let loopBad = 0;
for (let i = 2305; i + 12672 <= N; i++) if (states[i - 1] !== states[i - 1 + 12672]) loopBad++;
check('the registers repeat every 12,672 calls from call 2,305', loopBad, 0);
check('they do not repeat from call 2,304', states[2303] === states[2303 + 12672], false);

// the tune's whole state: its memory and the registers repeat from call 7,425
const U = createLoaderTune(D, C64Cpu);
U.init(0);
const reads = new Uint8Array(65536), executed = new Uint8Array(65536);
let at7425 = null;
for (let i = 1; i <= 7425 + 12672; i++) {
  U.play();
  if (i === 7425) at7425 = sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)]));
}
check('the whole state repeats from call 7,425', sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)])), at7425);

const mem = new Uint8Array(0x10000);
for (const [a, s] of D.blocks) mem.set(Buffer.from(s, 'base64'), a);
const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: { read: () => 0, write: () => {} } });
cpu.call(D.init, {}, { maxSteps: 200000, reads, executed });
for (let i = 0; i < 30000; i++) cpu.call(D.play, {}, { maxSteps: 200000, reads, executed });
let outside = 0;
for (let a = 0x100; a < 0x10000; a++) if ((reads[a] || executed[a]) && (a < 0xA000 || a > 0xACFA) && (a < 0xD400 || a > 0xD41F) && (a < 0x1F0 || a > 0x1FF)) outside++;
check('bytes read or run outside $A000-$ACFA, the zero page, the stack and the SID', outside, 0);

console.log(bad ? bad + ' difference(s)' : "arkanoid loading tune: the page's bytes are the cassette's, and its first 9,000 calls sound as VICE recorded them");
process.exit(bad ? 1 : 0);
