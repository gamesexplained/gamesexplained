#!/usr/bin/env node
'use strict';
// The Play tab runs its port (reference/bf-port.js) on the page's own image of the cartridge, in
// which every code byte the port does not read is zero. This holds that image to the game: the
// port runs on it, in the kit's lockstep (kit/nes/lockstep.js), beside the game's own code from
// the listing's bytes, through the start of a Balloon Trip and on until the random generators
// have taken over. Balloon Trip's first generator reads its list of balloons and sparks
// (trip_layout, $C4AD) for 63 runs, and the list holds 58, so the last five read on into the code
// after it (set_balloon_value, $C527): a page image that leaves those bytes zero makes no sparks
// where the game makes six and a balloon. test_play.js runs the port on the listing's bytes and
// its pilot rarely lives that long, so neither catches it. The player is held in the middle of
// the sky, in both, on the start platform's flag (invulnerable), so that nothing ends the trip.
//   node games/nes/balloon-fight/test_trip.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { Machine } = require(path.join(ROOT, 'kit/nes/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/nes/lockstep.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const { BalloonFight } = g.run('reference/bf-port.js', 'bf-port.js', 'BalloonFight');
const V = BalloonFight.V;

const page = g.read('play.html');
const data = JSON.parse(/<script type="application\/json" id="bf-play-data">([\s\S]*?)<\/script>/.exec(page)[1]);
const rom = Uint8Array.from(Buffer.from(data.game_rom, 'base64'));
if (rom.length !== 0x4000) { console.log('FAIL the page\'s game_rom is ' + rom.length + ' bytes, not 16 KB'); process.exit(1); }

const m = new Machine({ ram: g.listing().ram, pc: 0xC000, passAt: BalloonFight.PASS });
const P = BalloonFight.create(new Uint8Array(65536), {}, { CPU });
const ls = new Lockstep({ machine: m, port: P, program: p => p.program(), checkpoints: BalloonFight.CHECKPOINTS, nmis: { 0xC094: 'nmi' },
  maxFrames: 4000, irqBytes: [0x19, 0x4C], chips: ['ppu', 'apu'] });
P.M.set(rom, 0xC000); P.M.set(rom, 0x8000);              // the port on the page's image, as the Play tab runs it

// the controller: Select to Balloon Trip on the title screen, then Start; in the trip, nothing
let pass = 0, inTrip = 0, runs = 0;
const hold = (mem) => { mem[V.actor_y] = 100; mem[V.actor_x] = 128; mem[V.invulnerable] = 1; };
const r = ls.run({ passes: 1400, onPass: (n, mm) => {
  pass++;
  let pad = 0;
  if (!mm.ram[V.game_mode]) {
    if (pass > 60) pad = mm.ram[V.title_option] !== 2 ? (pass % 12 === 0 ? 4 : 0) : (pass % 12 < 2 ? 8 : 0);
  } else {
    inTrip++;
    if (mm.ram[V.actor_balloons] === 2) { hold(mm.ram); hold(P.M); }
    runs = mm.ram[V.trip_progress];
  }
  mm.pads[0] = pad; mm.pads[1] = 0;
} });
let fail = 0;
if (!r.ok) { console.log('FAIL the port on the page\'s image left the game in Balloon Trip\'s run ' + runs + ':\n' + describe(r)); fail++; }
if (r.ok && runs < 70) { console.log('FAIL the trip got only to generator run ' + runs + ' (' + inTrip + ' frames), short of the 63 that read the list'); fail++; }
if (!fail) console.log(inTrip + ' frames of Balloon Trip, ' + runs + ' generator runs: the port on the page\'s image matches the game');
process.exit(fail ? 1 : 0);
