# Aztec Challenge — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay of the U.S. Gold release (Cosmi), front and back,
  from the contributor's scans of their copy (`work/extras/`, not
  committed), read 8 November 2026. It is the game's manual: loading,
  controls, every level and the scoring table.
- The game's own instruction text at `$1600`-`$1A5F`, one block of eight
  lines for each level, read from the snapshot 8 November 2026.
- C64-Wiki, "Aztec Challenge",
  https://www.c64-wiki.com/wiki/Aztec_Challenge, read 8 November 2026.
- Wikipedia, "Aztec Challenge",
  https://en.wikipedia.org/wiki/Aztec_Challenge, read 8 November 2026.
  Its gameplay section mixes the 1982 Atari 8-bit game by Robert T.
  Bonifacio with this one; only the "Commodore 64 version" section is
  used here.
- Personal Computer News #56, 7 April 1984, review by Bob Chappell and
  Nevish Ash, at
  https://everygamegoing.com/larticle/gameplay-c64-aztec-challenge/4405,
  read 8 November 2026. It names U.S. Gold as the publisher.
- The cassette's own label: "(c) 1983 Cosmi Corp", read by the
  contributor on 9 November 2026. The boot program's card says 1983 too;
  the 1984 of some sources is a later release's.
- StrategyWiki's page and a manual on regvault.org refused automated
  reads (HTTP 403 and 401) on 8 November 2026 and were not read.

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in control port 2 only (manual: "will not function in CONTROL PORT NO. 1") | confirmed | all 14 reads are of `$DC00`; nothing reads `$DC01` (census); every level played from port 2 |
| Cosmi logo and title, then the player selection: F1 one player, F3 two players | live | spiral at `$1000`; select text `$5D40`, drawn by `$1500` |
| Attract "previews" of the levels until a function key is pressed | live | demos of the levels seen running from the select loop |
| Scorecard: level, phase and score for both players, the level's instruction text, "PRESS FIRE BUTTON TO START" | live | `$1195`-`$1229`, text blocks from `$1600` by `$1480` |
| Flashing player indicator ("1 UP") between the two columns | live | seen on the scorecard |
| RUN/STOP starts the game from the very beginning | live | `$1223`-`$122B`: on the scorecard, STOP jumps to `$1000` |
| Five lives per level; losing all five returns the scorecard and, with two players, passes the turn | confirmed | `$02` counts lives lost, `$1300`; live: five losses back to the scorecard on the same level. With two players the turn passes after every attempt, won or lost (live) |
| Staying on the same level until it is won | live | after five losses the level counter `$03` stayed at 1 |
| Win bonus: 1000, 800, 600, 400, 200 points for 0 to 4 lives lost | confirmed | `$1400`: adds 10, 8, 6, 4 or 2 hundreds by `$02`; live: the Gauntlet won with no life lost added 1,010 |
| 10 points for each achievement (dodging spears, jumping, crossing rooms) | confirmed | `$1456` adds 10 points `$68`+1 times; live: five losses with no achievements scored 10, a win with none 1,010 |
| Seven levels in a fixed order, then the next phase; four phases | confirmed | level digit `$03`/`$04` '1'-'7', phase `$05`/`$06` '1'-'4'; `$137C`-`$1390` |
| After phase 4 the game starts again from the beginning | confirmed | `$1390` jumps to `$1000` when the phase passes '4' |
| Later phases faster; the last phase "at night" | confirmed | phase tables `$5C50`-`$5C8F` copied to `$50`-`$5F` by `$1256`; phase 4's two colours darken the Gauntlet, Hopaztec's doorway, the Piranha and the Bridge (live); the Stairs, the Temple and the Vermin look the same by night |
| Background music that changes and builds with progress, on every level but level 5 | confirmed | `$1C00` plays the tune; `$6530` changes tune and voices by the stage `$45`, called by every level but Hopaztec |
| Level 1, The Gauntlet: run toward the temple between two rows of spear throwers; forward jumps, back ducks; staying jumped or ducked too long makes the runner fall; any spear kills | live | `$6000`; played; any input held 8 passes of the loop falls (`$614F`, traced) |
| Level 2, The Stairs: climb while stone blocks roll down; left and right dodge | live | `$6CF5`; played. Up and down alone also move left, and fire moves right (`$71A0`, traced) |
| Level 3, The Temple: a divided hallway; spears and stones fall, spikes rise, trapdoors open; left stops, right jumps high | live | `$7600`; played; four traps picked at random per room (`$7835`); only a touch on the runner's lower half alone catches it (`$79F0`, live: a spear on the head and on both halves passed, on the legs alone it caught) |
| Level 4, The Vermin: creatures; back is a low jump, forward a high one; touching a creature for more than a second kills | live | `$6595`; played; a bite is 8 steps of touching in a row (`$6BE0`); one of the six creatures never appears (live, 60 s) |
| Level 5, The Tiles (Hopaztec): hop in any direction across booby-trapped tiles to the door; after five lost lives a new pattern of bad tiles | live | `$7200`; the pattern is picked once per attempt (`$74C2`, called only from `$7200`), so it changes only after the fifth loss; a trapped tile throws spears from both walls (`$7502`); the floor is 65 tiles, four hops lead off it (`test_hop.js`, live); the patterns are windows of one fixed sequence (live, 20 lists) |
| Level 6, The Piranha: swim any direction, fire dives; under water for only 2 to 3 seconds or drown; must keep moving up the screen | live | `$7E98`; fire held alone drowned the swimmer 18 times in 60 s; progress counts passages off the edge of the lake (`$1AB8`, live) |
| Level 7, The Bridge: run across a grass bridge with holes; back low jump, left medium, forward high; jump at the last step | live | `$7B00`; played; the runner stays put while the planks scroll (`$7C8A`) |
| Fire must be pressed with the stick centred, or neither works (manual) | differs | true of the Piranha's swimming and diving (`$1DE0`), but its bite check tests the fire bit alone (`$1EA0`): fire with a direction kept the swimmer safe for a minute (live). On the Stairs fire moves right (`$71A0`) |

## Beyond the documentation

Found in the code, not in the manual.

- The level is held as the digit character itself ('1' to '7', `$31`-`$37`)
  and printed straight to the screen; so is the phase.

- The Bridge's gorge is drawn with the
  characters of Cosmi's spiral logo (`$4C00`).
- The Vermin's creature E, a green coiled snake, is set up but never
  shown: the spawner ORs `#$00` where it means its bit (`$6772`).
- The Bridge counts an achievement, 10 points, on every pass the stick is
  held in a direction other than fire alone, even right, which does not
  jump: 72 in 10 seconds (live).
- On the Piranha, progress is lost with each life: the stage goes back to
  0 (`$1CA0`), so the lake must be crossed in one life.

## Open questions

- C64-Wiki says losing all five lives restarts the level with points
  kept; Personal Computer News says it restarts the game. The code and
  the emulator (one player) keep the level and the score: C64-Wiki is
  right.
