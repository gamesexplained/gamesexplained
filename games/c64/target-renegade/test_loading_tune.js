#!/usr/bin/env node
// Hold music.html's loading tune player (the blocks tr-loader-tune and tr-loader-data) to the
// cassette. The page runs the tune's own code on the kit's 6502 over the bytes in tr-loader-data:
// the RAM at $B54C-$C7FF as VICE 3.10 (vice-mcp 3.14.0) held it on 11 November 2026 when the 1988
// cassette's first side, the Ultimate Tape Archive's "Target- Renegade Side 1.tap" (992,738 bytes,
// SHA-256 11d5456bf7e6ad609174d4c968f4fe54397da9e4b2dc8d5b2324555f140be1d1), reached the loader's
// call of $B54C ($08FD), about 89 seconds into the tape. The loader calls $B54C once, sets the
// volume to 15, then calls $B611 once a frame (it waits for raster line $10 each time) until it
// turns the sound off ($098F).
// - The bytes: their hash.
// - The sound: VICE stopped after each of the cassette's 11,579 calls of $B611 ($0914 and $0971)
//   and its SID state was recorded. The registers after each of the page's calls must be those.
//   VICE reports the top nibble of the pulse width registers ($D403, $D40A, $D411) as 0, as the
//   chip ignores it, and reports $D418's bit 3 in $D417's place, so both are left out.
// - The end: the tune fades itself out, one step of the volume every 96 calls from call 8,161,
//   and the page stops it at call 9,409, when the volume is down to 1, and not before.
// It exits 1 on any difference.
//   node games/c64/target-renegade/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createLoaderTune } = g.run('music.html', 'tr-loader-tune', 'createLoaderTune');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="tr-loader-data">([^<]*)<\/script>/.exec(g.read('music.html'));
if (!m) { console.log('music.html has no tr-loader-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
check('blocks', D.blocks.map(([a, s]) => a + ':' + Buffer.from(s, 'base64').length).join(), '46412:4788');
check('bytes $B54C-$C7FF', sha(Buffer.from(D.blocks[0][1], 'base64')), '4c94e5c2eafc1b6d1f4f1d77ef17bacd970e9ad7c0053821b406b89365a24dbe');
check('start, play, volume', [D.init, D.play, JSON.stringify(D.after)].join(), '46412,46609,[[24,15]]');

const masked = (r) => Array.from(r, (v, i) => (i === 23 ? v & 0xF7 : i === 3 || i === 10 || i === 17 ? v & 0x0F : v));
// the player as the page runs it: to its stop
const T = createLoaderTune(D, C64Cpu);
T.init(0);
const h = crypto.createHash('sha256');
let calls = 0, fadeFrom = 0;
while (T.playing() && calls < 20000) {
  T.play(); calls++;
  if (!fadeFrom && (T.sid[24] & 15) < 15) fadeFrom = calls;
  h.update(Buffer.from(masked(T.sid)));
}
check('calls until the player stops', calls, 9409);
check('the fade starts at call', fadeFrom, 8161);
check('SID registers to the stop', h.digest('hex'), '5685d64415e597b3c6826774d9a7352a55d633b6000b2000ab9908c887e8997c');
// the tune run on as the cassette runs it, past the player's stop
const mem = new Uint8Array(0x10000), regs = new Uint8Array(25);
for (const [a, s] of D.blocks) mem.set(Buffer.from(s, 'base64'), a);
const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: { read: () => 0, write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) regs[a - 0xD400] = v; } } });
cpu.call(D.init, {}, { maxSteps: 200000 });
regs[24] = 15;
const all = crypto.createHash('sha256');
for (let i = 0; i < 11579; i++) { cpu.call(D.play, {}, { maxSteps: 200000 }); all.update(Buffer.from(masked(regs))); }
check('SID registers, all 11,579 calls', all.digest('hex'), '5346a502af18ccfd80fe944e792d693a78d922f5ee9c37d0428c293ad39f441e');

console.log(bad ? bad + ' difference(s)' : "target-renegade loading tune: the page's bytes are the cassette's, and they sound as VICE recorded them to the end of the fade");
process.exit(bad ? 1 : 0);
