#!/usr/bin/env node
// Hold graphics.html's loading screen (the blocks btl-loading-data and btl-loading) to the cassette, Electric
// Dreams' 1987 tape, the Ultimate Tape Archive's "Big_Trouble_in_Little_China.tap" (571,243 bytes, SHA-256
// 4498a483eaa0cd754285f5f4f38b653b7ef1c1c14e160ab9729f69d64baffb71), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026:
// - D.first and D.credits are frames recorded with kit/c64/frame.py capture, then trim, 42 and 80 seconds in:
//   text screens at $0400 in bank 0 ($DD00 = $97), black border and background, the first on the character
//   ROM's upper-case set ($D018 = $15) and the second on its lower-case set ($D018 = $17). `frame.py compare`
//   found each drawn with the whole character ROM equal to VICE's own picture in every pixel but VICE's grey
//   dots where the loader stores to the border mid-line (10 and 11 of 104,448). Each carries rom_excerpt, the
//   glyphs of the screen codes its screen holds, 6 and 52 of them, from Commodore's character ROM 901225-01;
// - D.front: the screen read every 2 frames from 37 seconds in. B.T.L.C was printed at 37.1 seconds and
//   cleared at 46.6, when the screen took the second set; the credits then came in from the end of the screen
//   towards its start, D.front[j] being the lowest offset from which the screen held its final bytes 2 x j
//   frames after the switch, every byte below it a space. They were whole 162 frames after the switch;
// - memory read every 25 frames on another load: the credits stayed until the screen went blank between 88.0
//   and 88.5 seconds; a multicolour bitmap ($D018 = $29, $DD00 = $94) was on between 92.5 and 93.0, and was
//   the same picture as reference/title.png, the game's title screen, in all 64,000 of its pixels; the sound
//   chip read every 25 frames was silent until 297.0 seconds, when the title tune began.
// It exits 1 on any difference.
//   node games/c64/big-trouble-in-little-china/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { btlAt, btlFont } = g.run('graphics.html', 'btl-loading', 'btlAt', 'btlFont');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="btl-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no btl-loading-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
const screen = (F) => Buffer.from(F.ram[0].b, 'base64');
// the screen codes as letters: the upper-case set has A-Z at 1-26, the lower-case set a-z there and A-Z at 65-90
const say = (codes, lower) => [...codes].map((v) => (v >= 1 && v <= 26 ? String.fromCharCode((lower ? 96 : 64) + v)
  : v >= 65 && v <= 90 ? String.fromCharCode(v) : v === 96 ? ' ' : String.fromCharCode(v))).join('');
const row = (F, r, lower) => say(screen(F).subarray(r * 40, r * 40 + 40), lower).trim();

for (const [k, d018, writes, scr, col, rom, drawn] of [
  ['first', 0x15, 92, '9089a1a5aaf9fc71d53e940a860dc29f9e50e88c86a7432a66485f634d707ae3', '353c38352a855c80f4ecb0793a76493228541b5fab5ef7af26effac91e77ec46',
    '469b6853863fc90d4f4087fc3159429c3406637de9c946cd486cbdf6283edea1', '0e5a01e9fbffd93f67cac8499018675e73efbdf31c877dee16495460831ccbaa'],
  ['credits', 0x17, 78, '206c53cc0644a72a265d0acaa2ba6d1483d74625c4defd72ff554b3459589038', '6701295c24ebab274857152da28aa99f44b2fc15bfe8bbe66dc957d4b7db784c',
    '3cefe8242090d41524855df2337d1e3707bd7bb4be4f75267d17963b456edfee', '3f983cbc067af596d796554a8f9653be32690c7d0530823737b96410606af045']]) {
  const F = D[k];
  check(k + ': the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), '400:1000,3fff:1');
  check(k + ': $D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].join(), [0x1B, 0xC8, d018, 0x97].join());
  check(k + ': border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,0');
  check(k + ': the border writes, dark grey and black', [F.writes.length, F.writes.every((w) => w[2] === 0xD020 && (w[4] === 11 || w[4] === 0))].join(), writes + ',true');
  check(k + ': the screen', sha(screen(F)), scr);
  check(k + ': colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), col);
  // the excerpt holds the glyphs of the codes on the screen, and nothing else
  const base = d018 === 0x15 ? 0 : 0x800, want = [...new Set(screen(F))].sort((a, b) => a - b).map((c) => base + 8 * c);
  const have = F.rom_excerpt.ranges.flatMap((r) => Array.from({ length: Buffer.from(r.b, 'base64').length / 8 }, (_, i) => r.a + 8 * i));
  check(k + ': the ROM excerpt is the glyphs shown', [F.rom_excerpt.rom, have.join()].join('|'), ['chargen 901225-01', want.join()].join('|'));
  check(k + ': the ROM excerpt', sha(Buffer.concat(F.rom_excerpt.ranges.map((r) => Buffer.from(r.b, 'base64')))), rom);
  check(k + ': the screen drawn', sha(C64.renderFrame(btlFont(F)).px), drawn);
}
check('B.T.L.C in white in the top corner', [row(D.first, 0, false), Buffer.from(D.first.colour, 'base64').subarray(0, 7).every((c) => (c & 15) === 1)].join(), 'B.T.L.C,true');
check('the credits', [4, 5, 7, 8, 10, 19, 20].map((r) => row(D.credits, r, true)).join(' / '),
  'GAME AND GRAPHIC DESIGN / BY FOCUS / CODE AND EFFECTS / BY M D SOFTWARE AND EDWIN RAYNER / A SOFTWARE STUDIOS PRODUCTION / Copyright 1987 / Electric Dreams Software');
const colour = Buffer.from(D.credits.colour, 'base64');
check('the hidden line: Electric Dreams S, in black, where row 20 starts', [D.hidden.row, row(D.credits, 22, true),
  screen(D.credits).subarray(22 * 40, 22 * 40 + 24).equals(screen(D.credits).subarray(20 * 40, 20 * 40 + 24)),
  [...screen(D.credits).subarray(22 * 40, 23 * 40)].every((v, i) => v === 0x20 || (colour[22 * 40 + i] & 15) === 0)].join(), '22,Electric Dreams S,true,true');

// the credits as they came in
check('the front, every 2 frames', [D.wait, D.step, D.front.length, sha(Buffer.from(JSON.stringify(D.front)))].join(),
  '100,2,82,cce7ae8169ecbbe288c04f5d2f8c86608c4a4808ace5e091766f88615a879e66');
check('from the end of the screen to its start', [D.front[0], D.front.at(-1), D.front.every((v, i) => !i || v <= D.front[i - 1])].join(), '902,0,true');
const drawnAt = (k, lit) => sha(C64.renderFrame(btlAt(D, k, lit).frame).px);
check('the replay starts on B.T.L.C', drawnAt(0) === drawnAt(D.wait - 1) && drawnAt(0) === sha(C64.renderFrame(btlFont(D.first)).px), true);
const END = D.wait + D.step * (D.front.length - 1);
check('and ends on the credits whole', drawnAt(END) === sha(C64.renderFrame(btlFont(D.credits)).px), true);
const mid = btlAt(D, D.wait + D.step * 40, false), midScr = Buffer.from(mid.frame.ram[0].b, 'base64');
check('half way: spaces below the front, the credits from it on', [mid.from, midScr.subarray(0, mid.from).every((v) => v === 0x20),
  midScr.subarray(mid.from).equals(screen(D.credits).subarray(mid.from)), row(mid.frame, 21, true)].join(), D.front[40] + ',true,true,All Rights Reserved');
const lit = Buffer.from(btlAt(D, END, true).frame.colour, 'base64');
check('lit, the hidden line is grey and nothing else changes', [...lit.subarray(0, 1000)].every((c, i) => (Math.floor(i / 40) === 22 ? (c & 15) === 12 : c === colour[i])), true);

check('the page says so', ['About 37 seconds into Electric Dreams\' 1987 cassette', 'a line at a time from the bottom of the screen up',
  'They stay for 38 seconds', 'Then the title picture comes up whole, 93 seconds in', 'nearly three and a half minutes, until the title tune starts',
  'game and graphic design to Focus, and code and effects to M D Software and Edwin Rayner', 'the same in all 64,000 pixels']
  .filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "big-trouble-in-little-china loading screen: the page's credits, and the way they come in, are the ones recorded from the tape");
process.exit(bad ? 1 : 0);
