#!/usr/bin/env node
// Hold music.html's loading tune player (the blocks bl-loader-tune and bl-loader-data) to the
// cassette. The page runs the cassette's own code on the kit's 6502 over the bytes in
// bl-loader-data, the RAM as VICE 3.10 (vice-mcp 3.14.0) held it on 11 November 2026 when the
// cassette, the Ultimate Tape Archive's "Bruce_Lee.tap" (452,903 bytes, SHA-256
// dc9bd11008e1a9929a799769402b60a17daf6aadf2e9d4a08c2a787607dde8d8), first reached the stretch of
// its interrupt that plays the tune ($E0F8): $E003-$E007 and $E114-$E360 from then, and the list
// the tune reads from $EF80 ($EF80-$F516) once the tape had brought all of it in, 100 seconds after
// the tape started. Once a frame, while the tape loads, the interrupt runs from $E114 to $E1E7; the
// page does the same.
// - The bytes: their hashes, and the tune reads and runs nothing outside them, the stack and the
//   SID in 20,000 calls.
// - The sound: VICE stopped at $E1E7 on each of the tune's first 6,200 frames and its SID state was
//   recorded. The registers after the page's calls 1 to 6,200 must be those. VICE reports the top
//   nibble of the pulse width registers ($D403, $D40A, $D411) as 0, as the chip ignores it, and
//   reports $D418's bit 3 in $D417's place, so both are left out.
// - The loop the page gives sid.js: from call 1,893 the registers repeat every 3,892 calls, and
//   from call 1,893 so does the whole state, so the sound repeats for as long as it plays.
// It exits 1 on any difference.
//   node games/c64/bruce-lee/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createNovaloadTune } = g.run('music.html', 'bl-loader-tune', 'createNovaloadTune');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="bl-loader-data">([^<]*)<\/script>/.exec(g.read('music.html'));
if (!m) { console.log('music.html has no bl-loader-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
const bytes = D.blocks.map(([, s]) => Buffer.from(s, 'base64'));
check('blocks', D.blocks.map(([a], i) => a + ':' + bytes[i].length).join(), '57347:5,57620:589,61312:1431');
check('bytes', bytes.map(sha).join(), 'fa6994afa45bef8a430b4b3df346ad34a871309df2de0d28bfcfb64f456fb2c5,f136d2891f4ac5efae35ed740037967f1ad3553df0488f749df50db53cac8fcb,6f8971900f8a917a8a221423bb77da3edbfb91e4ef255a1ab9fc572627130f40');
check('play from, until', [D.play, D.until].join(), '57620,57831');

const masked = (r) => Array.from(r, (v, i) => (i === 23 ? v & 0xF7 : i === 3 || i === 10 || i === 17 ? v & 0x0F : v));
const T = createNovaloadTune(D, C64Cpu);
T.init(0);
const h = crypto.createHash('sha256'), states = [];
const N = 1893 + 2 * 3892;
for (let i = 1; i <= N; i++) {
  T.play();
  const r = masked(T.sid);
  if (i >= 1 && i <= 6200) h.update(Buffer.from(r));
  states.push(r.join());
}
check('SID registers, calls 1 to 6200', h.digest('hex'), '5908fd9c7077a9c6129cb0672cd8b1616ce2d144debc4728465747a7b536253c');
let loopBad = 0;
for (let i = 1893; i + 3892 <= N; i++) if (states[i - 1] !== states[i - 1 + 3892]) loopBad++;
check('the registers repeat every 3,892 calls from call 1,893', loopBad, 0);
check('they do not repeat from call 1,892', states[1893 - 2] === states[1893 - 2 + 3892], false);

// the tune's whole state: its memory and the registers repeat from call 1,893
const U = createNovaloadTune(D, C64Cpu);
U.init(0);
let at = null;
for (let i = 1; i <= 1893 + 3892; i++) {
  U.play();
  if (i === 1893) at = sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)]));
}
check('the whole state repeats from call 1,893', sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)])), at);

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

console.log(bad ? bad + ' difference(s)' : "bruce-lee loading tune: the page's bytes are the cassette's, and its calls 1 to 6200 sound as VICE recorded them");
process.exit(bad ? 1 : 0);
