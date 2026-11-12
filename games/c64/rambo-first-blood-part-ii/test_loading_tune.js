#!/usr/bin/env node
// Hold index.html's loading tune player (the blocks rb-loader-tune and rb-loader-data) to the
// cassette, and the Morse the page reads from it to the tune's own text and table.
// The page runs the tune's own code on the kit's 6502 over the bytes in rb-loader-data: the RAM at
// $2000-$31EE as VICE 3.10 (vice-mcp 3.14.0) held it on 12 November 2026 when the Ocean cassette,
// the Ultimate Tape Archive's "Rambo-_First_Blood_Part_II.tap" (743,231 bytes, SHA-256
// 34059888c29dc8d504cae593d4c3a3c5efde258b30a9af0dace1e72b74409bff), reached its first call of the
// tune's start ($2003, a JMP to $30E3). The cassette sets the volume to 15 ($4006), calls $2003
// once and then $2000 once a frame, from its loop at $41D3.
// - The bytes: their hash, and the tune reads and runs nothing outside them in 12,000 calls but the
//   zero page, the stack and the SID.
// - The sound: VICE stopped after each of the cassette's first 9,000 calls of $2000 and its SID
//   state was recorded. The registers after each of the page's first 9,000 calls must be those.
//   Before each call the cassette calls $2006, which gives 0 once the tune has ended: the page's
//   player stops there, after 10,815 calls (3 minutes 36 seconds). The cassette never gets there:
//   memory read every 25 frames in VICE showed it start the tune 72.5 seconds into the tape, as
//   the screen turns yellow, and stop calling it and clear the SID at 274.5 seconds, 10,100 frames
//   later (3 minutes 22 seconds).
//   VICE reports the top nibble of the pulse width registers ($D403, $D40A, $D411) as 0, as the
//   chip ignores it, and reports $D418's bit 3 in $D417's place, so both are left out.
// - The Morse (rbMorse): the tune points its play vector at its Morse routine ($310B) at call 51
//   and back at the music ($2606) once the text's 0 is read. Read from voice 1 as the page plays
//   it, the 54 letters are BELLBARNA...: the text at $319E (each letter's code doubled) is spelled
//   right, and the letter table at $31D5 (one byte a letter: the signals in the top bits, 1 for a
//   dash, and their count less one in the bottom two) is International Morse for 25 letters, with
//   $10 for I, which is one dot, an E. The times the page states: a dot three calls, a dash seven,
//   three between signals and eleven between letters, from about a second to 31 seconds in.
// It exits 1 on any difference.
//   node games/c64/rambo-first-blood-part-ii/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createLoaderTune, rbMorse } = g.run('index.html', 'rb-loader-tune', 'createLoaderTune', 'rbMorse');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('index.html');
const m = /<script type="application\/json" id="rb-loader-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('index.html has no rb-loader-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
check('blocks', D.blocks.map(([a, s]) => a + ':' + Buffer.from(s, 'base64').length).join(), '8192:4591');
check('bytes $2000-$31EE', sha(Buffer.from(D.blocks[0][1], 'base64')), '908e56199f40fcf1ecf1ab3cb5597993919ab6a088c91305892b974e4c1e262d');
check('start, check, play, before', [D.init, D.check, D.play, JSON.stringify(D.before)].join(), '8195,8198,8192,[[24,15]]');

// the sound, against VICE
const T = createLoaderTune(D, C64Cpu);
T.init(0);
const masked = (r) => Array.from(r, (v, i) => (i === 23 ? v & 0xF7 : i === 3 || i === 10 || i === 17 ? v & 0x0F : v));
const h = crypto.createHash('sha256');
let filtered = 0;
for (let i = 1; i <= 9000; i++) {
  T.play();
  h.update(Buffer.from(masked(T.sid)));
  if (T.sid[23] & 7 || T.sid[24] & 0x70) filtered++;
}
check('SID registers, 9,000 calls', h.digest('hex'), '824620a0a1f6e5c63fe0f2eca8f6272ff77085de99daeaa3c5bf8a8557753b2b');
check('calls that route a voice through the filter', filtered, 0);
// the end: $2006 first gives 0 before call 10,816, so the tune is 10,815 calls, 3 minutes 36 seconds
for (let i = 9001; i <= 10815; i++) { T.play(); if (!T.playing()) { check('playing until call 10,815, stopped at', i, 10816); break; } }
check('playing after call 10,815', T.playing(), true);
T.play();
check('playing after call 10,816', T.playing(), false);

// the Morse
const mem = new Uint8Array(0x10000);
for (const [a, s] of D.blocks) mem.set(Buffer.from(s, 'base64'), a);
let text = '';
for (let a = 0x319E; mem[a]; a++) text += String.fromCharCode(mem[a] >> 1);
check('the text at $319E', text, 'BILLBARNADAVIDCOLLIERMARTINGALWAYTONYPOMFRETSTEVEWAHID');
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
const decode = (v) => { let s = ''; for (let k = 0; k <= (v & 3); k++) s += (v << k) & 0x80 ? '-' : '.'; return s; };
const wrong = [];
for (const [c, code] of Object.entries(MORSE)) if (decode(mem[0x3194 + c.charCodeAt(0)]) !== code) wrong.push(c + '=$' + mem[0x3194 + c.charCodeAt(0)].toString(16) + ':' + decode(mem[0x3194 + c.charCodeAt(0)]));
check('letters the table at $31D5 gets wrong', wrong.join(), 'I=$10:.');
check('I as it should be, $01', decode(0x01), '..');
const r = rbMorse(D, C64Cpu);
check("the page's text", r.text, text);
check('voice 1 sends', r.letters.map((l) => l.ch).join(''), 'BELLBARNADAVEDCOLLEERMARTENGALWAYTONYPOMFRETSTEVEWAHED');
check('every letter as the table gives it', r.letters.map((l) => l.code).join(), [...text].map((c) => decode(mem[0x3194 + c.charCodeAt(0)])).join());

// the times the page states, from voice 1's gate and the play vector
const U = createLoaderTune(D, C64Cpu);
U.init(0);
const on = new Map(), off = new Map();
let gate = 0, run = 0, from = 0, to = 0;
for (let i = 1; i <= 1600; i++) {
  U.play();
  const morse = (U.mem[0x2001] | U.mem[0x2002] << 8) === 0x310B;
  if (morse && !from) from = i;
  if (!morse && from && !to) to = i;
  const gt = U.sid[4] & 1;
  if (gt === gate) { run++; continue; }
  if (from && !to) (gate ? on : off).set(run, ((gate ? on : off).get(run) || 0) + 1);
  gate = gt; run = 1;
}
check('the Morse routine plays from call / to call', from + '/' + to, '51/1558');
check('signal lengths (calls: how many)', [...on].sort((a, b) => a[0] - b[0]).map(([k, n]) => k + ':' + n).join(), '3:79,7:60');
check('the shortest gaps: between signals, between letters', [...off].filter(([k]) => k < 12).sort((a, b) => a[0] - b[0]).map(([k, n]) => k + ':' + n).join(), '3:85,11:53');
check('last letter ends at call', r.letters[r.letters.length - 1].at, 1556);
check('the page says so', ['a second into the tune and ends 31 seconds in', 'a dot lasts three frames, a dash seven, with three frames between them and eleven between letters',
  'The tune runs for 3 minutes 36 seconds, but the cassette stops it after 3 minutes 22 seconds, about 14 seconds before its end', 'starts the tune about 73 seconds in']
  .filter((s) => !page.includes(s)).join(), '');

// nothing outside the bytes
const reads = new Uint8Array(65536), executed = new Uint8Array(65536);
const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: { read: () => 0, write: () => {} } });
cpu.call(D.init, {}, { maxSteps: 200000, reads, executed });
for (let i = 0; i < 12000; i++) cpu.call(D.play, {}, { maxSteps: 200000, reads, executed });
let outside = 0;
for (let a = 0x100; a < 0x10000; a++) if ((reads[a] || executed[a]) && (a < 0x2000 || a > 0x31EE) && (a < 0xD400 || a > 0xD41F) && (a < 0x1F0 || a > 0x1FF)) outside++;
check('bytes read or run outside $2000-$31EE, the zero page, the stack and the SID', outside, 0);

console.log(bad ? bad + ' difference(s)' : "rambo loading tune: the page's bytes are the cassette's, its first 9,000 calls sound as VICE recorded them, and its Morse turns every I into an E");
process.exit(bad ? 1 : 0);
