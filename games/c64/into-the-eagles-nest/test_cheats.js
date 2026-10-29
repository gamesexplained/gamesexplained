#!/usr/bin/env node
// The Play tab's cheats (EaglePlay.cheats, reference/en-play.js). The page's machine runs from the
// hand-over, fire takes it through the title and the two selects, and in play the stick moves and
// fires at random, the same play in every run. Random play is rarely walked into, so every 64th
// frame of play the test makes a hit as a guard walking into the player makes one, through
// P.hit_the_player ($639F, which move_figure at $612A calls through P). With the cheats off the hits
// rise and the rounds are spent, so each cheat has something to stop. With No hits the hits at $02C6
// never rise; with Full ammunition the rounds at $02BD read 99 after the first stamp ($5B1B); with
// Always a key a key is in hand ($02AC = 1) from the ninth frame of a floor on, on the same frames
// as with the game's own cheat: both write it in the interrupt, so a door opened in the main loop
// leaves the hand empty until the next one. With %MAGGOTS!& the game's flag $603F stays set
// through every floor built and stops the hits itself. Switched off, the flag goes back to the
// game's own check, which finds no cheat word in the name. With the word written as the last name
// typed ($081F) and no switch on, the game's own check sets it.
//   node games/c64/into-the-eagles-nest/test_cheats.js [frames]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
require(path.join(ROOT, 'site/lib/c64.js'));
globalThis.C64Sid = null;
const { loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const fs = require('fs');
require(path.join(__dirname, 'reference/en-core.js'));
const groups = fs.readdirSync(path.join(__dirname, 'reference')).filter((f) => /^en-g.*\.js$/.test(f)).sort()
  .map((f) => require(path.join(__dirname, 'reference', f)));
const EaglePlay = require(path.join(__dirname, 'reference/en-play.js'));
const FRAMES = +process.argv[2] || 4000;
const RAM = loadListing(path.join(__dirname, 'listing.json'));

let failed = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) failed++; };

// one session: on are the switches, at(i, play, cheat) a hook each frame; gives what it saw in play
function session(on, at) {
  const play = EaglePlay.create({ M: RAM.slice(), groups, keep: {} });
  const cheat = EaglePlay.cheats(play, on), M = play.M;
  let seed = 5, j = 0x1F, target = 0;
  const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF;
  const WAYS = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x0F, 0x0E, 0x0D, 0x0B, 0x07];
  const s = { inPlay: 0, hitsUp: 0, roundsDown: 0, not99: 0, noKey: 0, flagOff: 0, flagOn: 0, floors: 0 };
  let first = 0, hits = -1, rounds = -1, stamped = false, wasPlay = false;
  for (let i = 0; i < FRAMES; i++) {
    const inPlay = M[0x0315] === 0x4A && M[0x02D3] === 0;
    if (!inPlay) play.joy = i % 90 < 6 ? 0x0F : 0x1F;
    else { if (i % 12 === 0) j = WAYS[Math.floor(rnd() * WAYS.length)]; play.joy = j; }
    if (inPlay && s.inPlay % 64 === 63) play.P.hit_the_player({});
    if (at) at(i, play, cheat);
    play.run(target += EaglePlay.FRAME);
    const now = M[0x0315] === 0x4A && M[0x02D3] === 0;
    if (now && !wasPlay) { s.floors++; first = s.inPlay; hits = M[0x02C6]; rounds = M[0x02BD]; stamped = false; }
    wasPlay = now;
    if (!now) continue;
    s.inPlay++;
    if (M[0x02C6] > hits) s.hitsUp++;
    if (M[0x02BD] < rounds) s.roundsDown++;
    hits = M[0x02C6]; rounds = M[0x02BD];
    if (stamped && M[0x02BD] !== 0x99) s.not99++;
    stamped = true;
    if (s.inPlay - first > 8 && M[0x02AC] !== 1) s.noKey++;
    if (M[0x603F]) s.flagOn++; else s.flagOff++;
  }
  return s;
}
const show = (s) => `${s.inPlay} frames of play on ${s.floors} floors`;

const off = session({});
ok(off.inPlay > 500 && off.hitsUp > 0 && off.roundsDown > 0 && off.flagOn === 0,
  `cheats off: ${show(off)}, the hits rose on ${off.hitsUp} and the rounds fell on ${off.roundsDown}, the flag never set`);
const parts = session({ hits: true, ammo: true, key: true });
ok(parts.inPlay > 500 && parts.hitsUp === 0 && parts.not99 === 0 && parts.noKey < parts.inPlay / 100 && parts.flagOn === 0,
  `No hits, Full ammunition and Always a key: ${show(parts)}, hits rose ${parts.hitsUp}, rounds below 99 ${parts.not99}, no key ${parts.noKey}, flag set ${parts.flagOn}`);
const word = session({ word: true });
ok(word.inPlay > 500 && word.flagOff === 0 && word.hitsUp === 0 && word.noKey === parts.noKey,
  `%MAGGOTS!&: ${show(word)}, the flag clear on ${word.flagOff}, hits rose ${word.hitsUp}, no key ${word.noKey}, as with Always a key`);
let after = -1;
const half = Math.floor(FRAMES / 2);
session({ word: true }, (i, play, cheat) => { if (i === half) { cheat.set('word', false); after = play.M[0x603F]; } });
ok(after === 0, `%MAGGOTS!& switched off in play: the game's own check leaves the flag ${after}`);
const WORD = Array.from(RAM.subarray(0x6F31, 0x6F3B));
const typed = session({}, (i, play) => { if (i === 0) for (let x = 0; x < 10; x++) play.M[0x081F + x] = WORD[x]; });
ok(typed.inPlay > 500 && typed.flagOff === 0 && typed.hitsUp === 0,
  `the cheat word as the last name typed, no switch on: ${show(typed)}, the flag clear on ${typed.flagOff}, hits rose ${typed.hitsUp}`);
if (failed) process.exit(1);
