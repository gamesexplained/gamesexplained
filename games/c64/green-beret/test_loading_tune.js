#!/usr/bin/env node
// Hold index.html's loading tune player (the blocks gb-loader-tune and gb-loader-data) to the
// cassette. The page runs the tune's own code on the kit's 6502 over the bytes in gb-loader-data:
// the RAM at $A000-$ACED as VICE 3.10 (vice-mcp 3.14.0) held it on 11 November 2026 when the Imagine
// cassette, the Ultimate Tape Archive's "Green_Beret.tap" (724,171 bytes, SHA-256
// 03c923eab33b067da5c060747d2024934e18d24ae3401b84f5638ec0bfd8d09d), reached its call of the tune's
// start ($AACA, from $011A). The cassette sets $D416 to 100 and the volume to 15, calls $AACA once
// and then $AA31 once a frame, from its loop at $0120: a counter the tune steps once a call, at
// $A871, fell by 10 every 10 frames in VICE. The disk, the C64 Preservation Project's G64 that
// orientation.md names, holds the same bytes at $A000-$ACED, and plays them from the same address.
// - The bytes: their hash, and the tune reads and runs nothing outside them in 30,000 calls but
//   $20A9, which the BIT at $ABE1 reads to skip the LDA inside it, and throws away.
// - The sound: VICE stopped after each of the cassette's first 12,200 calls of $AA31 and its SID
//   state was recorded. The registers after each of the page's first 12,200 calls must be those.
//   VICE reports the top nibble of the pulse width registers ($D403, $D40A, $D411) as 0, as the
//   chip ignores it, and reports $D418's bit 3 in $D417's place, so both are left out.
// - The loop the page gives sid.js: from call 7,937 the registers repeat every 3,840 calls, and
//   from call 10,369 so does the tune's whole state, so the sound repeats for as long as it plays.
// It exits 1 on any difference.
//   node games/c64/green-beret/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createLoaderTune } = g.run('index.html', 'gb-loader-tune', 'createLoaderTune');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="gb-loader-data">([^<]*)<\/script>/.exec(g.read('index.html'));
if (!m) { console.log('index.html has no gb-loader-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
check('blocks', D.blocks.map(([a, s]) => a + ':' + Buffer.from(s, 'base64').length).join(), '40960:3310');
check('bytes $A000-$ACED', sha(Buffer.from(D.blocks[0][1], 'base64')), 'c4208358f273af89882ff3f96dbd6e91e4a8180838768f903242493ee3ad025a');
check('start, play, before', [D.init, D.play, JSON.stringify(D.before)].join(), '43722,43569,[[22,100],[24,15]]');

const T = createLoaderTune(D, C64Cpu);
T.init(0);
const masked = (r) => Array.from(r, (v, i) => (i === 23 ? v & 0xF7 : i === 3 || i === 10 || i === 17 ? v & 0x0F : v));
const h = crypto.createHash('sha256'), states = [];
const N = 7937 + 2 * 3840;
for (let i = 1; i <= N; i++) {
  T.play();
  const r = masked(T.sid);
  if (i <= 12200) h.update(Buffer.from(r));
  states.push(r.join());
}
check('SID registers, 12,200 calls', h.digest('hex'), '692cbccee9575535c29d70b59ab294d15892041a3c946262e0376845ce92e1e7');
let loopBad = 0;
for (let i = 7937; i + 3840 <= N; i++) if (states[i - 1] !== states[i - 1 + 3840]) loopBad++;
check('the registers repeat every 3,840 calls from call 7,937', loopBad, 0);
check('they do not repeat from call 7,936', states[7935] === states[7935 + 3840], false);

// the tune's whole state: its memory and the registers repeat from call 10,369
const U = createLoaderTune(D, C64Cpu);
U.init(0);
let at = null;
for (let i = 1; i <= 10369 + 3840; i++) {
  U.play();
  if (i === 10369) at = sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)]));
}
check('the whole state repeats from call 10,369', sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)])), at);

const mem = new Uint8Array(0x10000);
for (const [a, s] of D.blocks) mem.set(Buffer.from(s, 'base64'), a);
const reads = new Uint8Array(65536), executed = new Uint8Array(65536);
const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: { read: () => 0, write: () => {} } });
cpu.call(D.init, {}, { maxSteps: 200000, reads, executed });
for (let i = 0; i < 30000; i++) cpu.call(D.play, {}, { maxSteps: 200000, reads, executed });
let outside = 0;
for (let a = 0x100; a < 0x10000; a++) if ((reads[a] || executed[a]) && (a < 0xA000 || a > 0xACED) && (a < 0xD400 || a > 0xD41F) && (a < 0x1F0 || a > 0x1FF) && a !== 0x20A9) outside++;
check('bytes read or run outside $A000-$ACED, the zero page, the stack and the SID', outside, 0);

console.log(bad ? bad + ' difference(s)' : "green-beret loading tune: the page's bytes are the cassette's, and its first 12,200 calls sound as VICE recorded them");
process.exit(bad ? 1 : 0);
