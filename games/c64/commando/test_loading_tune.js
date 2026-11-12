#!/usr/bin/env node
// Hold index.html's loading tune player (the blocks cm-loader-tune and cm-loader-data) to the
// cassette. The page runs the cassette's own code on the kit's 6502 over the bytes in
// cm-loader-data, the RAM as VICE 3.10 (vice-mcp 3.14.0) held it on 11 November 2026 when Elite's
// 1985 cassette, the Ultimate Tape Archive's "Commando.tap" (606,572 bytes, SHA-256
// 042aedeb656e07143ace7d7b3b5db92f5671c37eb09c1530faf8e5f69dd7d8d2), first reached the stretch of
// its interrupt that plays the tune ($E0F8): $E003-$E007 and $E114-$E360 from then, and the list
// the tune reads from $EF80 ($EF80-$F4CC) once the tape had brought all of it in, 120 seconds after
// the tape started. Once a frame, while the tape loads, the interrupt runs from $E114 to $E1E7; the
// page does the same.
// - The bytes: their hashes, and the tune reads and runs nothing outside them, the stack and the
//   SID in 20,000 calls.
// - The sound: VICE stopped at $E1E7 on each of the tune's first 6,100 frames and its SID state was
//   recorded. The registers after the page's calls 2 to 6,100 must be those after its frames 1 to
//   6,099: the first frame of the recording also holds registers the cassette had set before the
//   tune began. VICE reports the top nibble of the pulse width registers ($D403, $D40A, $D411) as
//   0, as the chip ignores it, and reports $D418's bit 3 in $D417's place, so both are left out.
// - The loop the page gives sid.js: from call 354 the registers repeat every 3,300 calls, and from
//   call 2,642 so does the whole state, so the sound repeats for as long as it plays.
// It exits 1 on any difference.
//   node games/c64/commando/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createNovaloadTune } = g.run('index.html', 'cm-loader-tune', 'createNovaloadTune');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="cm-loader-data">([^<]*)<\/script>/.exec(g.read('index.html'));
if (!m) { console.log('index.html has no cm-loader-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
const bytes = D.blocks.map(([, s]) => Buffer.from(s, 'base64'));
check('blocks', D.blocks.map(([a], i) => a + ':' + bytes[i].length).join(), '57347:5,57620:589,61312:1357');
check('bytes', bytes.map(sha).join(), 'fa6994afa45bef8a430b4b3df346ad34a871309df2de0d28bfcfb64f456fb2c5,79e091c130b15c9ed5e6de79653074f3b0bae713b0a7b8f278b2875194155d98,02d86898042445c7ae2084ff38e283b34a0042b35770bf6345ed7c6c7edb16e8');
check('play from, until', [D.play, D.until].join(), '57620,57831');

const masked = (r) => Array.from(r, (v, i) => (i === 23 ? v & 0xF7 : i === 3 || i === 10 || i === 17 ? v & 0x0F : v));
const T = createNovaloadTune(D, C64Cpu);
T.init(0);
const h = crypto.createHash('sha256'), states = [];
const N = 2642 + 2 * 3300;
for (let i = 1; i <= N; i++) {
  T.play();
  const r = masked(T.sid);
  if (i >= 2 && i <= 6100) h.update(Buffer.from(r));
  states.push(r.join());
}
check('SID registers, calls 2 to 6100', h.digest('hex'), 'b2ac8f1dbd869cf67c65506c2bae1d4283d4dd84ec01591a9aac4de60ce4de8d');
let loopBad = 0;
for (let i = 354; i + 3300 <= N; i++) if (states[i - 1] !== states[i - 1 + 3300]) loopBad++;
check('the registers repeat every 3,300 calls from call 354', loopBad, 0);
check('they do not repeat from call 353', states[354 - 2] === states[354 - 2 + 3300], false);

// the tune's whole state: its memory and the registers repeat from call 2,642
const U = createNovaloadTune(D, C64Cpu);
U.init(0);
let at = null;
for (let i = 1; i <= 2642 + 3300; i++) {
  U.play();
  if (i === 2642) at = sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)]));
}
check('the whole state repeats from call 2,642', sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)])), at);

const mem = new Uint8Array(0x10000);
for (const [a, s] of D.blocks) mem.set(Buffer.from(s, 'base64'), a);
const reads = new Uint8Array(65536), executed = new Uint8Array(65536);
const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: { read: () => 0, write: () => {} } });
cpu.sp = 0xFF;
for (let i = 0; i < 20000; i++) { cpu.pc = D.play; cpu.run({ until: D.until, maxSteps: 200000, reads, executed }); }
const inside = (a) => D.blocks.some(([b], i) => a >= b && a < b + bytes[i].length) || (a >= 0xD400 && a <= 0xD41F) || (a >= 0x100 && a <= 0x1FF);
let outside = 0;
for (let a = 0; a < 0x10000; a++) if ((reads[a] || executed[a]) && !inside(a)) outside++;
check('bytes read or run outside the blocks, the stack and the SID', outside, 0);

console.log(bad ? bad + ' difference(s)' : "commando loading tune: the page's bytes are the cassette's, and its calls 2 to 6100 sound as VICE recorded them");
process.exit(bad ? 1 : 0);
