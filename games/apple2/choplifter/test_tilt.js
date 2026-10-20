#!/usr/bin/env node
// The helicopter section's pictures, reference/tilt.js: the helicopter drawn by the game's own
// routines from the listing on the kit's 6502.
//   live    eighteen frames of helicopters landing with a lean in Apple2TS, run as an Apple II Plus
//           from play-sortie1.json (work/verify/tilt.py, 20 October 2026): six landings, four facing
//           right and two facing left, three frames each as they rock level. Each frame was stopped
//           where heli_object ($8276) starts drawing, its page blackened, and kept once its three
//           drawing calls were done ($8298). ChopTilt.place draws the same state the same way, and
//           the page must hold the same 8,192 bytes; the pages are game memory, so this file keeps
//           only their SHA-256.
//   skids   at every tilt, facing either way, the helicopter rocked from level on its pad keeps its
//           lowest dots on screen line 167 or 168, the end of a skid on the ground, as index.html says.
//   node games/apple2/choplifter/test_tilt.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
g.run('reference/demo.js', 'demo.js', 'ChopDemo');
const { ChopTilt } = g.run('reference/tilt.js', 'tilt.js', 'ChopTilt');
const LIVE = [                         // [what heli_object was drawn from, SHA-256 of the page], from Apple2TS
  [{ x: 4713, height: 8, tilt: 4, facing: 1, bounce: 0, view: 4616, rotor: 4, tail: 0 }, 'e0b74422562bdf78'],
  [{ x: 4716, height: 7, tilt: 2, facing: 1, bounce: 0, view: 4616, rotor: 2, tail: 6 }, '7bb4744b8243896b'],
  [{ x: 4718, height: 7, tilt: 0, facing: 1, bounce: 0, view: 4616, rotor: 0, tail: 4 }, '24b3a0a14566fd72'],
  [{ x: 4735, height: 7, tilt: 2, facing: 1, bounce: 0, view: 4616, rotor: 4, tail: 0 }, '4e7ac7defdc32827'],
  [{ x: 4737, height: 7, tilt: 0, facing: 1, bounce: 0, view: 4616, rotor: 2, tail: 6 }, '9ea4fc1be555a627'],
  [{ x: 4737, height: 6, tilt: 0, facing: 1, bounce: 1, view: 4616, rotor: 0, tail: 4 }, '47386abe5f7a1e7d'],
  [{ x: 4775, height: 8, tilt: -2, facing: 1, bounce: 0, view: 4616, rotor: 4, tail: 0 }, 'afbd17ec6ac48fae'],
  [{ x: 4773, height: 7, tilt: 0, facing: 1, bounce: 0, view: 4616, rotor: 2, tail: 6 }, 'b64cd5bb702f689b'],
  [{ x: 4773, height: 6, tilt: 0, facing: 1, bounce: 1, view: 4616, rotor: 0, tail: 4 }, 'f74852279316b5e3'],
  [{ x: 4797, height: 9, tilt: -4, facing: 1, bounce: 0, view: 4616, rotor: 4, tail: 0 }, 'f76a4616aae5a201'],
  [{ x: 4794, height: 8, tilt: -2, facing: 1, bounce: 0, view: 4616, rotor: 2, tail: 6 }, '4dd7cfff9536f002'],
  [{ x: 4792, height: 7, tilt: 0, facing: 1, bounce: 0, view: 4616, rotor: 0, tail: 4 }, '0b703218667a8ed6'],
  [{ x: 4686, height: 9, tilt: 4, facing: -1, bounce: 0, view: 4572, rotor: 4, tail: 4 }, '316d5335a0b3d5e0'],
  [{ x: 4689, height: 8, tilt: 2, facing: -1, bounce: 0, view: 4572, rotor: 2, tail: 2 }, '0bacda08c3cb901b'],
  [{ x: 4691, height: 7, tilt: 0, facing: -1, bounce: 0, view: 4572, rotor: 0, tail: 0 }, '06a102173af14c33'],
  [{ x: 4718, height: 8, tilt: -4, facing: -1, bounce: 0, view: 4614, rotor: 2, tail: 2 }, '13f51dacfc05a5a2'],
  [{ x: 4714, height: 7, tilt: -1, facing: -1, bounce: 0, view: 4614, rotor: 0, tail: 0 }, 'c3aaf52e1d5f466e'],
  [{ x: 4713, height: 7, tilt: 0, facing: -1, bounce: 0, view: 4614, rotor: 4, tail: 6 }, '6a1199c76467425d'],
];
let bad = 0;
const st = ChopTilt.start(g.listing());
const hash = b => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex').slice(0, 16);
for (const [at, want] of LIVE) {
  const d = ChopTilt.place(st, at), got = hash(d.m.subarray(d.page, d.page + 0x2000));
  if (got !== want) { bad++; console.log(`live: ${JSON.stringify(at)}: page ${got}, Apple2TS ${want}`); }
}
const line = o => {                    // the screen line of a byte's offset in a hi-res page
  for (let y = 0; y < 192; y++) {
    const b = 0x400 * (y % 8) + 0x80 * (Math.floor(y / 8) % 8) + 0x28 * Math.floor(y / 64);
    if (o >= b && o < b + 40) return y;
  }
  return -1;
};
for (const facing of [1, -1]) for (let tilt = -5; tilt <= 5; tilt++) {
  const d = ChopTilt.draw(st, tilt, facing), low = Math.max(...d.changed.map(line));
  if (d.tilt !== tilt || low < 167 || low > 168) {
    bad++; console.log(`skids: facing ${facing}, tilt ${tilt}: rocked to ${d.tilt}, lowest line ${low}`);
  }
}
if (bad) { console.log(`FAIL - ${bad} of ${LIVE.length + 22} cases`); process.exit(1); }
console.log(`ok - ${LIVE.length} live frames drawn byte for byte; 22 tilts keep a skid on the ground`);
