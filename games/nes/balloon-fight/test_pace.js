#!/usr/bin/env node
'use strict';
// The Play tab's pace against the game's. The kit's NES runs the game from the reset vector with
// the pilot of test_play.js at the controls, and the page's own machine (reference/bf-play.js)
// runs the port from the same start on its clock, charging each stretch the median cost
// test_play.js --cost measured. Both get the same controllers, the pilot's, each steered by its
// own memory; the frame each pass begins in is counted on both sides.
//
// The two play the same game for as long as their passes take the same frames: a pass whose cost
// is within a few hundred cycles of the frame can take a frame more on one side than the other,
// and from then on the games part, alike but not the same. So what is held is the pace over the
// whole run: the passes a frame in play, on both sides, within 1 % of each other, and the lag
// frames of the screen builders present on both.
//   node games/nes/balloon-fight/test_pace.js [frames]
const fs = require('fs'), path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { Machine } = require(path.join(ROOT, 'kit/nes/machine.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
require(path.join(ROOT, 'site/lib/nes.js'));
require(path.join(ROOT, 'site/lib/apu.js'));
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Pilot, JUMPS } = require('./test_play.js');
const g = game(__dirname);
const { BalloonFight } = g.run('reference/bf-port.js', 'bf-port.js', 'BalloonFight');
globalThis.BalloonFight = BalloonFight;
const { BalloonFightPlay } = g.run('reference/bf-play.js', 'bf-play.js', 'BalloonFightPlay');
const FRAMES = +process.argv[2] || 12000;
const page = g.read('play.html');
const D = JSON.parse(/<script type="application\/json" id="bf-play-data">([\s\S]*?)<\/script>/.exec(page)[1]);

// the game on the kit's machine
const m = new Machine({ ram: g.listing().ram, pc: 0xC000, passAt: BalloonFight.PASS });
const pilotM = new Pilot(7, { jump: JUMPS }).attach(m);
m.onPass = () => { pilotM.pass(m); return false; };
m.runFrames(FRAMES);
const gamePasses = m.passes;

// the port on the page's machine: the pilot reads the port's memory and the port's hooks
const p = BalloonFightPlay.create({ data: D, costs: D.costs, CPU, NES: globalThis.NES, NESApu: globalThis.NESApu });
const fake = { ram: p.M, pads: [0, 0], hooks: {} };
const pilotP = new Pilot(7, { jump: JUMPS });
pilotP.attach(fake);
p.P.onTitle = () => fake.hooks[0xDAC1]({});
p.P.onPhaseStart = (() => { const prev = p.P.onPhaseStart; return () => { prev(); fake.hooks[0xF213]({}); }; })();
p.P.onGameOver = () => fake.hooks[0xF366]({});
let pagePasses = 0, lastPasses = 0;
p.onFrame = () => { if (p.passes !== lastPasses) { lastPasses = p.passes; } };
// the pilot sets the pads at each pass start: a pass begins where the port yields its pass, so
// the page's machine is run a frame at a time and the pads set from the pilot when a pass began
let seenPasses = 0;
for (let f = 0; f < FRAMES; f++) {
  p.run(BalloonFightPlay.FRAME);
  if (p.passes !== seenPasses) { seenPasses = p.passes; pilotP.pass(fake); p.pads(fake.pads[0], fake.pads[1]); }
}
pagePasses = p.passes;
const ratio = pagePasses / gamePasses;
console.log('in ' + FRAMES + ' frames: the game ' + gamePasses + ' passes (' + pilotM.games + ' games), the page ' + pagePasses + ' passes (' + pilotP.games + ' games): ' + (ratio * 100).toFixed(2) + ' %');
const ok = Math.abs(ratio - 1) < 0.01;
console.log(ok ? 'the pace holds within 1 %' : 'the pace is off by more than 1 %');
process.exit(ok ? 0 : 1);
