'use strict';
// Holds the Gameplay tab's two widgets that run the game's own code on the kit's 6502 over the
// listing's memory (block friday-camp in gameplay.html). A round with the player standing still runs
// out of time when the danger clock reaches $C0: 96 steps of 128 counts of pass_count, less the
// counts start_play has already made. Run frame by frame, the game's loop counts at the 4.48 frames
// a count measured in play. The jumpscare walks the player from room 13 into room 14 with a body in
// it: scare_check raises Gerry's fear by twice his fear value, show_gore fills colour RAM with the
// picture's colour (9 for the head, 1 for the skulls), the scream stops everything for
// SCREAM_FRAMES frames, and draw_room then leaves the play area as levels.html draws room 14. In
// some rounds Jason, hunting someone in the church, stands at x 28, y 77 in room 11 to the end
// (Discoveries, "stuck"): seed 1 is one of them. Also: every copy of the shared blocks is the same.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const g = game(__dirname);
g.sameBlock('friday-room'); g.sameBlock('createScreamDriver');
const { fridayCamp, fridayJumpscare, SCREAM_FRAMES } = g.run('gameplay.html', 'friday-camp', 'fridayCamp', 'fridayJumpscare', 'SCREAM_FRAMES');
const { fridayRoom } = g.run('gameplay.html', 'friday-room', 'fridayRoom');
const ram = g.listing('parts/game/listing.json').ram;
let bad = 0;
const fail = t => { console.log('FAIL ' + t); bad++; };

// A whole round, standing still
{
  const C = fridayCamp(ram, kit, { seed: 1 }), m = C.m, start = m[0x08D5];
  let stuckAt = -1;
  while (!C.over) {
    C.step();
    const J = m[0x0992];
    if (stuckAt < 0 && (m[0x090E + J] & 0x3F) === 7 && m[0x08E2 + J] === 0x1A && m[0x08ED + J] === 28 && m[0x08F8 + J] === 77) stuckAt = C.count;
  }
  const want = 96 * 128 - start - 1;
  if (C.over !== 'time' || C.count !== want) fail(`seed 1: the round should run out of time after ${want} counts; it ended '${C.over}' after ${C.count}`);
  const J = m[0x0992];
  if (stuckAt < 0 || m[0x08E2 + J] !== 0x1A || m[0x08ED + J] !== 28 || m[0x08F8 + J] !== 77) fail(`seed 1: Jason should end the round stuck in room 11 at 28, 77`);
  else console.log(`seed 1: out of time after ${C.count} counts; Jason stuck in room 11 at 28, 77 from count ${stuckAt}`);
}

// Frames a count
{
  const C = fridayCamp(ram, kit, { seed: 3 }), c0 = C.count;
  let f = 0;
  while (C.count - c0 < 600) { C.frame(); f++; }
  const rate = f / (C.count - c0);
  if (Math.abs(rate - 4.48) > 0.1) fail(`frames a count: ${rate.toFixed(2)}, the game's 4.48`);
  else console.log(`frames a count: ${rate.toFixed(2)}`);
}

// The jumpscare
const room14 = fridayRoom(ram, kit, 14).m;
for (const [scare, colour] of [['head', 9], ['skulls', 1]]) {
  const C = fridayJumpscare(ram, kit, { seed: 99, scare }), m = C.m, fear = m[0x0938];
  C.stick(1, 0);
  let at = -1, f = 0, pic = null;
  for (; f < 600; f++) {
    if (C.frame() === 'scream') { at = f; C.stick(0, 0); pic = new Set(); for (let o = 0; o < 640; o++) if (o % 40 >= 4 && o % 40 < 36) pic.add(C.colour[o]); }
    if (at >= 0 && f === at + 1 && C.frame() !== '') fail(`${scare}: the game ran during the scream`);
    if (at >= 0 && f > at + SCREAM_FRAMES + 150) break;
  }
  if (at < 0) { fail(`${scare}: no scream`); continue; }
  if (m[0x086C] !== 14) fail(`${scare}: the player should be in room 14, is in ${m[0x086C]}`);
  if (pic.size !== 1 || !pic.has(colour)) fail(`${scare}: the picture's colour RAM should be all ${colour}, is ${[...pic]}`);
  if (m[0x0938] !== fear + 2 * m[0x9419]) fail(`${scare}: fear ${fear} should rise by twice ${m[0x9419]}, is ${m[0x0938]}`);
  if (m[0x09F1 + C.body] !== 1) fail(`${scare}: scare_seen should be set for friend ${C.body}`);
  let diff = 0;
  for (let a = 0; a < 640; a++) if (a % 40 >= 4 && a % 40 < 36) {
    if (m[0x5400 + a] !== room14[0x5400 + a]) diff++;
    for (let y = 0; y < 8; y++) if (m[0x4000 + a * 8 + y] !== room14[0x4000 + a * 8 + y]) diff++;
  }
  if (diff) fail(`${scare}: ${diff} bytes of the play area differ from room 14 as levels.html draws it`);
  else console.log(`${scare}: scream at frame ${at}, picture in colour ${colour}, fear ${fear} to ${m[0x0938]}, room 14 drawn over it`);
}
console.log(bad ? `${bad} failure(s)` : 'camp and jumpscare: all checks pass; every copy of friday-room and createScreamDriver is the same');
process.exit(bad ? 1 : 0);
