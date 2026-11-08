#!/usr/bin/env node
'use strict';
// The recorded game the Play tab's Watch button plays (route/route.json, found by
// route/find_route.js): one player from power-on through phases 1 to 3 and the first bonus
// round, to the start of phase 4. The recording is each controller's buttons at the game's reads
// of it (route/route.js). Checks:
// - on the kit's NES, from the listing's bytes, the recording plays the game to every milestone
//   route.json keeps, at the same read and frame: each phase begun, each change of score, of lives
//   and of the player's balloons, each bonus balloon popped, the player's place every 60 reads;
//   and the game is at phase 4 with no life lost when it ends;
// - the page plays it the same way: the Play tab's own machine (reference/bf-play.js) with the
//   recording fed at each read, as the Watch button feeds it, reaches every milestone at the same
//   read, with the same value, within a few frames (the page's clock charges each stretch a
//   median cost, so a frame can lag here where it did not there);
// - the page's copy (reference/bf-route.js) is the one this makes from route.json.
// With --write it writes the milestones into route.json and makes the page's copy, after a new
// recording. The replay on jsnes and MesenCE, the second machines, is route/check_emulator.py.
//   node games/nes/balloon-fight/test_route.js [--write]
const fs = require('fs'), path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { Machine } = require(path.join(ROOT, 'kit/nes/machine.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
require(path.join(ROOT, 'site/lib/nes.js'));
require(path.join(ROOT, 'site/lib/apu.js'));
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { READ, V, feeder, Watch } = require('./route/route.js');
const g0 = game(__dirname);
const { BalloonFight } = g0.run('reference/bf-port.js', 'bf-port.js', 'BalloonFight');
globalThis.BalloonFight = BalloonFight;
const { BalloonFightPlay } = g0.run('reference/bf-play.js', 'bf-play.js', 'BalloonFightPlay');

const ROUTE = path.join(__dirname, 'route/route.json'), COPY = path.join(__dirname, 'reference/bf-route.js');
const rec = JSON.parse(fs.readFileSync(ROUTE, 'utf8'));
const WRITE = process.argv.includes('--write'), AFTER = 1200, SLACK = 4;
let fails = 0;
const check = (ok, what) => { if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const show = m => 'read ' + m[0] + ', frame ' + m[1] + ', ' + m[2] + ' ' + m[3];

// --- the kit's NES
const feed = feeder(rec), seen = new Watch();
// the RAM clear, as at power-on and on the page: the listing carries the RAM of the snapshot it was
// made from, and the game reads some bytes before it writes them (balloons_popped, $05CD)
const ram = g0.listing().ram;
ram.fill(0, 0, 0x800);
const m = new Machine({ ram, pc: 0xC000, passAt: BalloonFight.PASS });
m.hooks[READ] = cpu => { const x = cpu.x & 1; m.pads[x] = feed(x); seen.read(m.ram, m.frames); };
let end = -1;
// on past the last read until phase 4 begins: the bonus round's results count up with no read
for (let f = 0; f < 60000 && (end < 0 || (m.ram[V.phase] < 4 && m.frames < end + AFTER)); f++) { m.runFrames(1); if (end < 0 && feed.done()) end = m.frames; }
// a life lost is the count going down: it goes up from 0 when the game starts
const reads = feed.reads(0), lives = seen.marks.filter((k, i, all) => k[2] === 'lives' && all.slice(0, i).some(j => j[2] === 'lives' && j[3] > k[3]));
check(end >= 0, 'the kit\'s NES: the recording played to its end, ' + reads.toLocaleString('en-GB') + ' reads, at frame ' + end);
check(m.ram[V.phase] === 4, 'and the game is at phase 4 (phase_index ' + m.ram[V.phase] + ')');
check(lives.length === 0, 'with no life lost' + (lives.length ? ': ' + lives.map(show).join('; ') : ''));

if (WRITE) {
  rec.milestones = seen.marks;
  rec.end = { reads, frame: end };
  fs.writeFileSync(ROUTE, JSON.stringify(rec) + '\n');
  console.log('wrote ' + seen.marks.length + ' milestones to ' + path.relative(ROOT, ROUTE));
}
const want = rec.milestones || [];
const at = (a, b) => a.length === b.length && a.every((k, i) => k.every((v, j) => v === b[i][j]));
check(at(seen.marks, want), 'every one of the ' + want.length + ' milestones at its read and frame' + (at(seen.marks, want) ? '' : ': ' + firstDiff(seen.marks, want)));

function firstDiff(got, exp) {
  for (let i = 0; i < Math.max(got.length, exp.length); i++) {
    const a = got[i], b = exp[i];
    if (!a || !b || a.some((v, j) => v !== b[j])) return 'milestone ' + i + ': got ' + (a ? show(a) : 'none') + ', want ' + (b ? show(b) : 'none');
  }
  return '';
}

// --- the page's copy
const copy = '/* bf-route.js: made by test_route.js --write from route/route.json; do not edit */\n' +
  '// The recorded game the Watch button plays: each controller\'s buttons at the game\'s reads of it,\n' +
  '// as runs of [value, count] (route/route.js), and the milestones the page shows as it plays.\n' +
  'const BalloonFightRoute = ' + JSON.stringify({ p1: rec.p1, p2: rec.p2, end: rec.end, phases: want.filter(k => k[2] === 'phase').map(k => [k[0], k[3] >> 8, k[3] & 255]) }) + ';\n' +
  'if (typeof module !== \'undefined\') module.exports = { BalloonFightRoute };\n';
if (WRITE) { fs.writeFileSync(COPY, copy); console.log('wrote ' + path.relative(ROOT, COPY)); }
check(fs.existsSync(COPY) && fs.readFileSync(COPY, 'utf8') === copy, 'the page\'s copy is the recording (reference/bf-route.js)');

// --- the page
const D = JSON.parse(/<script type="application\/json" id="bf-play-data">([\s\S]*?)<\/script>/.exec(g0.read('play.html'))[1]);
const g = BalloonFightPlay.create({ data: D, costs: D.costs, CPU, NES: globalThis.NES, NESApu: globalThis.NESApu });
const pfeed = feeder(rec), pseen = new Watch();
g.onBoot = () => {};
g.boot();
g.onRead = x => { const v = pfeed(x); pseen.read(g.M, g.frames); return v; };
let pend = -1;
for (let f = 0; f < 60000 && (pend < 0 || (g.M[V.phase] < 4 && g.frames < pend + AFTER)); f++) { g.run(BalloonFightPlay.FRAME); if (pend < 0 && pfeed.done()) pend = g.frames; }
check(pend >= 0 && g.M[V.phase] === 4, 'the page: the recording played to its end at frame ' + pend + ', at layout ' + g.M[V.phase]);
let worst = 0, wrong = null;
for (let i = 0; i < want.length; i++) {
  const a = pseen.marks[i], b = want[i];
  if (!a || a[0] !== b[0] || a[2] !== b[2] || a[3] !== b[3]) { wrong = 'milestone ' + i + ': got ' + (a ? show(a) : 'none') + ', want ' + show(b); break; }
  worst = Math.max(worst, Math.abs(a[1] - b[1]));
}
if (!wrong && pseen.marks.length !== want.length) wrong = pseen.marks.length + ' milestones, want ' + want.length;
check(!wrong && worst <= SLACK, 'every milestone at the same read with the same value, ' + worst + ' frames apart at most' + (wrong ? ': ' + wrong : ''));

console.log(fails ? fails + ' FAILED' : 'all route checks pass');
process.exit(fails ? 1 : 0);
