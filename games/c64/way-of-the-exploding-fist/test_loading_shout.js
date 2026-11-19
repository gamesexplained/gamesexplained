#!/usr/bin/env node
// Hold music.html's loader shout (the blocks ls-data and ls-shout) to the disk's files and to the shout timed in
// the emulator. The disk is the C64 Preservation Project's
// kung-fu_way_of_the_exploding_fist[melbourne_house_1985](pal)(!).g64, its files read with kit/c64/disk.py:
// M.TSOUND (5,634 bytes, SHA-256 f3277f0b51d0be2021d686e0e20bfccc3d62067b50d3a4fb6f124f784d63260d), loaded at
// $2000, and M.SPCHTBL (770 bytes, SHA-256 d8e24304a136fa15b2d79d8c53bd906f87b1f6be30061a363de7251aeeed1b1d),
// loaded at $9800. The page carries both without their two-byte load addresses.
// Melbourne House's 1985 cassette, the Ultimate Tape Archive's "Way_of_the_Exploding_Fist,_The.tap" (596,605
// bytes, SHA-256 81d407d5877d5faaad40c9b10b8542790c0a064f81bac9cea9a2ac6217081695), loaded in VICE 3.10 with
// vice-mcp 3.14.0 on 12 November 2026, holds the same 5,632 and 768 bytes at $2000 and $9800 when it plays the
// shout, and at $9000 the disk's file LOADER, all but 7 of its 272 bytes (its working bytes). That code sets CIA
// 1's timer A to run out every 9 cycles and timer B to count timer A, and on each interrupt from timer B flips
// $D418 between 0 and 15, reads the next byte from $2000 on and loads timer B with that byte's count from $9800
// (low) and $9900 (high), until it has read $35D6. Measured with a checkpoint on every store to $D418 and VICE's
// cycle stopwatch, 4,479 gaps in a row from the byte at $2457: their total was 0.7 % longer than 9 x (count + 1)
// of those bytes; 2,726 were within 4 cycles of it, and most of the rest come in pairs, one late by about 42
// cycles and the next early by as much, where an interrupt was held up. Stores to $D418 counted every 10 frames:
// 5,596 on the cassette from 138.0 to 140.4 seconds, and the same 5,596 on the disk after 1 at its menu.
// It exits 1 on any difference.
//   node games/c64/way-of-the-exploding-fist/test_loading_shout.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };
const { lsGaps } = g.run('music.html', 'ls-shout', 'lsGaps');

const page = g.read('music.html');
const m = /<script type="application\/json" id="ls-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('music.html has no ls-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
check('M.TSOUND, without its load address', sha(Buffer.from(D.tsound, 'base64')), '982c3b991aaf403047cffb00121d43fced8b748ec10501a8b063f558802dfa5c');
check('M.SPCHTBL, without its load address', sha(Buffer.from(D.spchtbl, 'base64')), '10736cf402bfc5df74d00285f8a14df48a4601ae16798e2812b3ece72e595f02');
check('where they load, and the last byte played', [D.load, D.table, D.end].map((x) => x.toString(16)).join(), '2000,9800,35d6');
const gaps = lsGaps(D), total = gaps.reduce((a, b) => a + b, 0);
check('bytes played, cycles in all, the shortest and longest gap', [gaps.length, total, Math.min(...gaps), Math.max(...gaps)].join(), '5591,2202543,54,3609');
check('the gaps', sha(Buffer.from(JSON.stringify(gaps))), 'fda8cbc59fa458d11253c65fe6a170f07481a03e23b0101f990a0201c298040d');
// timed live, the gaps from the byte at $2457 on were 253, 466, 306, 407, 295, 431, 243, 471, 277, 468 and 278 cycles
check('the first gaps timed live', gaps.slice(0x457, 0x457 + 12).join(), '252,468,306,405,297,432,243,468,279,468,279,405');
check('the page says so', ['Each of the shout\'s 5,591 bytes picks the time to the next switch from a table', 'a byte that picks a count of n gives 9 &times; (n + 1) cycles',
  'every 394 cycles, a wave of about 1,250 hertz', 'M.TSOUND and M.SPCHTBL', 'Loading stops while it plays, for two and a quarter seconds']
  .filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "way-of-the-exploding-fist loader's shout: the page's bytes are the disk's files, timed as the loader times them");
process.exit(bad ? 1 : 0);
