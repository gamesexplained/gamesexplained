# Encounter — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, https://www.c64-wiki.com/wiki/Encounter, read 2026-09-20
- Wikipedia, https://en.wikipedia.org/wiki/Encounter!_(video_game), read 2026-09-20
- The Novagen manual as transcribed at
  http://c64-games.blogspot.com/2009/11/encounter-manual.html, read 2026-09-20
- Finnish Retro Game Comparison Blog (C64 vs Atari 8-bit),
  http://frgcb.blogspot.com/2015/09/encounter-synapse-software-1983.html, read 2026-09-20
- The contributor's transcription of the original C64 manual,
  https://github.com/air/encounter#original-c64-manual, read 2026-09-20
- The game itself in the emulator, 2026-09-20 (title screen text, first
  minute of level 1)

The sources disagree in places: the wiki says "seventeen UFO types" and
"10–19 enemies per level"; the comparison blog says two adversary types
(saucers and homing drones) with two new saucer attack strategies per
level; the manual says eight levels. Each is a claim to check, not a fact.

## Features

### Title screen and setup

| Feature | Status | Where |
|---|---|---|
| Title screen: ENCOUNTER, BY PAUL WOAKES, © 1984 NOVAGEN SOFTWARE, SCORE / LAST SCORE / HIGH SCORE, F5 NOVICE, F7 BEGIN GAME | live | title loop at $9CBA (orientation) |
| F5 cycles skill level: Novice, Advanced, Expert (wiki); the title shows the current one | traced | $9D2B-$9D4B: F5 ($C5 = 6) steps $62 through 2 NOVICE (default), 1 ADVANCED, 0 EXPERT and copies the name from hidden title rows 20-21 ($6B20 + 16 × skill) to $6B88; skill picks a column of the tables at $8F80 |
| F7 begins the game | live | $9D27 `cmp #$03` (F7's $C5 code) → $9D68 |
| Number keys restart at a level already completed in this session (manual, wiki: 1–8) | differs (live) | $9CD4 maps keys 8..1 through the table at $6931 to $A8 = index × 16; the comparison with the highest level reached ($68CB) at $9CE3 is followed by two `NOP`s instead of a branch, so any level can be chosen at any time |
| Attract / demo mode when the title is left alone: the game plays itself | live | title loop counts $F7/$F8/$F9 down and jumps to $9D7A, which sets $A8 = $70 and starts play through $9E46; seen at level 2 with $A8 = $70 and no input given (reference/demo-level2.png) |
| Last score and high score kept across games | traced | $ABED copies the SCORE line of the title screen to LAST SCORE ($6AC2), compares $8BA0-$8BA3 with the high score $8BA4-$8BA7 in BCD and rewrites the HIGH SCORE digits at $6B12 |

### Play

| Feature | Status | Where |
|---|---|---|
| First-person view: blue sky with clouds, horizon line, green ground, black cylindrical obelisks (pillars) on a flat plain | live | reference/play-level1-start.png; sky, horizon and ground are `$D021` bands from the raster chain $B2FE-$B3EA, clouds and the hill line are sprites 2-7 ($B9A5), obelisks are composited characters ($AD76) |
| Joystick in port 2: forward, reverse, turn left and right, and diagonals rotate (manual); fire button shoots; hold for continuous fire (wiki) | traced (turning right seen live) | $BC31 reads $DC00; $A1F7 dispatches up → $B508 forward, down → $B56C reverse, right → $B4D8, left → $B4F0; fire → $ACB6 with an 8-pass lock $5C, so holding fire repeats |
| Status row: score (7 digits), L<level>, E<enemies remaining>, S<shields> (S4 at the start of a game) | live | screen row 0 at $6000, wide font |
| Radar (octagonal scanner under the view) shows enemies relative to the player at centre | traced (dot seen live) | sprite 0 is the blip, placed at $AB21-$AB44 from the enemy's bearing and range through a polar-to-cartesian conversion and clamped to the scanner box |
| Console lights either side of the radar: yellow = saucer present, blue flashing = saucer firing, red flashing plus a low whine rising in pitch as it approaches = homing missile (manual) | traced | $AA70 recolours five cells of rows 19/21/23: row 21 yellow (7) at $A466 when a saucer launches, back to 8 at $A8CC; row 23 light blue ($0E) at $AA22 when it fires, reset at $A0C6; row 19 red/pink at $A7FB/$A800 while a missile lives; the whine at $A811 uses range $31 |
| Shields: start with four; losing the last ends the game; maximum nine (manual, wiki) | live (four at start, plus one at the last kill, game over on the death after S0: six deaths in the demo run) | the count is the status digit at $6026/$6027: $9F89 writes 4, $ABDC subtracts one on death, $ABDA goes to game over at zero, $A91D adds one when the last enemy of a level dies, capped at 9 |
| Obelisks block movement, are indestructible and stop both player and enemy shots (wiki); 64 of them on the field (comparison blog) | traced | objects 32-95 are 64 obelisks of type 3 on a 32-unit grid with a cell map at $8A00; $AC30 stops shots and enemy shots (deflecting them), $B50C refuses a player move within $43 units and $B53F plays the bump |
| Homing missiles are not stopped by obelisks and must be shot (manual) | traced (two missile spawns counted live) | the missile is object 2 driven by $A7F0, which never calls the obelisk test $AC30; $A894 tests it against the player's shots |
| Enemies appear one at a time from a white warp gate (wiki) | live (the flash rectangle $BA04 ran 483 passes for 13 spawns) | one enemy slot (object 2); $A42C spawns a saucer and shows object 7 (shape family $E0) as the warp-in flash from the spawn until $20 passes after the saucer starts moving (live: passes 52 to 131 of a recorded spawn, the saucer starting at 100) |
| Saucer behaviours: evasion, scattered shots, clouds of fire, permanent fire (wiki); two new strategies per level (blog) | traced | 16 types; type = random in 0..2 × level − 1 ($A42C), the first two spawns after a level-up being the two new types ($9E); dispatch table $AAB5 has four handlers: default $A5D6, burst fire $A563, script fire $A5C7, permanent fire $A70D; fire scripts at $8C00 |
| Each level has 10–19 enemies (wiki) | confirmed | $AA8F: a random byte masked to `$10-$1F` into $8BA8 (BCD); E11 in the snapshot, E15 on another run |
| UFO point values 100–1600 (wiki) | traced | table at $8BB0: (type + 1) × 100 for 16 types; a missile scores $8BAC = 500; the award is paid level times ($A1 at $AAC8, $A8B2) |
| Explosion colour sequence white, yellow, orange, red, brown, black, the same for every enemy (blog) | traced | $A14F indexes the nibble-pair table at $8CF0 by the fragment lifetime; $B467 blends the two nibbles on alternate frames |
| Sound: two simultaneous voices for enemy indicators; missile whine; engine noise in the transition (blog) | traced | voice 3 saucer hum from range ($A5F2), voices 2 and 3 missile whine ($A811), voice 1 engine loop ($A231/$B415), warp tone ramp ($A4CD) |
| Space pauses and resumes; F1 aborts the game (manual, wiki) | differs (live) | F1 aborts to the title ($A118); SPACE pauses ($A12A → $A13B) but the pause ends on a joystick direction, not on SPACE |

### Between levels

| Feature | Status | Where |
|---|---|---|
| When the enemy counter reaches zero a stargate opens: a black rectangular hole whose position shows on the scanner; the player must line up with its centre (manual) | live (opened once in the demo after the count was poked to 1) | $A8B2 at count zero sets $69 and adds a shield; $A2A1 activates object 3 at the last enemy's X for $F0 passes; $BA04 draws it as a rectangle rising from the horizon; $A4EC tests entry with $AD26 |
| Warp phase: propelled at high speed through a hail of spheres to avoid (manual); the wiki calls it a 30-second missile gauntlet | live (351 passes of $A713 before a sphere hit) | $A713/$A757: scene $80, speed ramps by $A5 toward $A7E8[level], spheres (shapes $A7E0) spawn in slots 8-23 every 3 passes, about four 256-frame periods long |
| Success awards an extra shield, maximum nine; missing the gate or hitting a sphere returns the player to the previous level and costs one shield (manual) | differs (partly) | the extra shield is awarded at the last kill ($A91D), before the gate; missing the gate ($A552) returns to play with a fresh enemy count and no shield change; a sphere hit runs the ordinary death ($AB9A), which does cost a shield |
| Eight levels (manual); odd and even levels alternate colour schemes (blog) | traced | level index $63 runs $70 (level 1) down to $00 (level 8) in steps of $10; scene records at $8010 + $63 alternate a coloured sky (odd) and a black sky (even); $A798 increments the level digit |

### Cheats reported

| Feature | Status | Where |
|---|---|---|
| POKE 30430,0 ($76DE) or POKE 34722,0 ($87A2) for invulnerability (wiki, marked untested there) | open | $76DE is inside the sprite-image block at $7000 and $87A2 inside the maths tables; neither is code on the death path, so these POKEs most likely belong to a different memory layout (another crack or the tape version); not tested |

## Beyond the documentation

Found in the code, not in the manual.

- The picture is a text screen. The raster chain repaints the background
  colour per band (sky, three horizon lines, ground) and every object is
  composited into dynamically allocated characters from 32 pre-scaled
  scripts per family ($9600/$9700, renderer $AD76); the ground half of
  the view is the sky half reflected by copying the screen rows with the
  codes inverted and byte-reversing the charset ($B1EC). The view is
  double-buffered ($6000/$4000 and $6400/$5000).
- Joystick fire starts a game from the title screen ($9D13).
- The enemy count, level, score and shields on the status row are the
  game's own copies: the shield count exists only as the screen digit at
  $6026.
- An idle timer $58 (256-frame units) makes a homing missile come after
  24 periods without a kill or shot, and makes a saucer leave after the
  same time.
- The game checks for PAL at $9DEC; on an NTSC machine it draws the title
  screen and hangs at $DBE8 (tested live; see facts.md, Oddities).

## Open questions

- Whether this copy is the original Novagen release or a crack: the
  cruncher is scene-style but no cracktro or trainer appears.
