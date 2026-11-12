#!/usr/bin/env node
// Hold index.html's loading tune player (the blocks pd-loader-tune and pd-loader-data) to the
// cassette. The page runs the cassette's copy of the sound driver on the kit's 6502 over the bytes
// in pd-loader-data: $F4-$FF and $B800-$C884 as VICE 3.10 (vice-mcp 3.14.0) held them on 11 November
// 2026 when the 1989 Activision cassette, the Ultimate Tape Archive's "Power_Drift.tap" (805,770
// bytes, SHA-256 85a89286612581b24ad43c6d23d5781d96d36efec7df00c60fdb00c5b938abbf), reached its
// call of sound_reset ($B80A, from $09A6), with the tune's number, 1, in $B804. The cassette's
// interrupt then calls sound_play ($B800) once a frame (from $094A).
// - The bytes: their hashes, and the driver reads and runs nothing outside them, the stack and the
//   SID in 20,000 calls but the raster line, $D012, which the page reads as 0.
// - The sound: VICE stopped after each of the cassette's first 4,399 calls of $B800 and its SID
//   state was recorded. The registers after each of the page's first 4,399 calls must be those.
//   VICE reports the top nibble of the pulse width registers ($D403, $D40A, $D411) as 0, as the
//   chip ignores it, and reports $D418's bit 3 in $D417's place, so both are left out.
// - The loop the page gives sid.js: from call 7 the registers repeat every 3,072 calls, and from
//   call 1,045 so does the driver's whole state, so the sound repeats for as long as it plays.
// - The driver's bytes from $B800 to $C4B9 are the disk's, in listing.json, but for its variables.
// It exits 1 on any difference.
//   node games/c64/power-drift/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createLoaderTune } = g.run('index.html', 'pd-loader-tune', 'createLoaderTune');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="pd-loader-data">([^<]*)<\/script>/.exec(g.read('index.html'));
if (!m) { console.log('index.html has no pd-loader-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
const bytes = D.blocks.map(([, s]) => Buffer.from(s, 'base64'));
check('blocks', D.blocks.map(([a], i) => a + ':' + bytes[i].length).join(), '244:12,47104:4229');
check('bytes', bytes.map(sha).join(), '108dd719c89e494a0fcac56c0bed34a285238ec9ea3fa234193033fc9f0a7413,e6f510e872ea7476d157c402dd1c6433261438037fb3c394ffbbd0931e05d0da');
check('start, play, after', [D.init, D.play, JSON.stringify(D.before || null), JSON.stringify(D.after)].join(), '47114,47104,null,[[24,15]]');

const T = createLoaderTune(D, C64Cpu);
T.init(0);
const masked = (r) => Array.from(r, (v, i) => (i === 23 ? v & 0xF7 : i === 3 || i === 10 || i === 17 ? v & 0x0F : v));
const h = crypto.createHash('sha256'), states = [];
const N = 1045 + 2 * 3072;
for (let i = 1; i <= N; i++) {
  T.play();
  const r = masked(T.sid);
  if (i <= 4399) h.update(Buffer.from(r));
  states.push(r.join());
}
check('SID registers, 4,399 calls', h.digest('hex'), '3e23a1b7cc83fd9f10a6e36b31da8076e154baadc643e23c049e669732855c3f');
let loopBad = 0;
for (let i = 7; i + 3072 <= N; i++) if (states[i - 1] !== states[i - 1 + 3072]) loopBad++;
check('the registers repeat every 3,072 calls from call 7', loopBad, 0);
check('they do not repeat from call 6', states[5] === states[5 + 3072], false);

// the driver's whole state: its memory and the registers repeat from call 1,045
const U = createLoaderTune(D, C64Cpu);
U.init(0);
let at = null;
for (let i = 1; i <= 1045 + 3072; i++) {
  U.play();
  if (i === 1045) at = sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)]));
}
check('the whole state repeats from call 1,045', sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)])), at);

const mem = new Uint8Array(0x10000);
for (const [a, s] of D.blocks) mem.set(Buffer.from(s, 'base64'), a);
const reads = new Uint8Array(65536), executed = new Uint8Array(65536);
const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: { read: () => 0, write: () => {} } });
cpu.call(D.init, {}, { maxSteps: 200000, reads, executed });
for (let i = 0; i < 20000; i++) cpu.call(D.play, {}, { maxSteps: 200000, reads, executed });
const inside = (a) => D.blocks.some(([b], i) => a >= b && a < b + bytes[i].length) || (a >= 0xD400 && a <= 0xD41F) || (a >= 0x100 && a <= 0x1FF) || a === 0xD012;
let outside = 0;
for (let a = 0; a < 0x10000; a++) if ((reads[a] || executed[a]) && !inside(a)) outside++;
check('bytes read or run outside the blocks, the stack, the SID and $D012', outside, 0);

// the driver is the disk's: listing.json's bytes from $B800 to $C4B9, but for the variables
// ($B804, the tune's number, and the voices' workspace and shadow registers at $C055-$C100, which
// the listing leaves without bytes)
const disk = g.listing(), tape = bytes[1];
let differ = 0;
for (let a = 0xB800; a <= 0xC4B9; a++) if ((!disk.has[a] || disk.ram[a] !== tape[a - 0xB800]) && a !== 0xB804 && (a < 0xC055 || a > 0xC100)) differ++;
check('driver bytes that differ from the disk outside its variables', differ, 0);

console.log(bad ? bad + ' difference(s)' : "power-drift loading tune: the page's bytes are the cassette's, and its first 4,399 calls sound as VICE recorded them");
process.exit(bad ? 1 : 0);
