# Rick Dangerous — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The Firebird cassette, `Rick Dangerous (1989)(Firebird).tap` (SHA-1 in
`orientation.md`), analysed from `work/play-level1.vsf`. No build or
version string was found in memory. The multiplexer's buffers at
`$3963`-`$3973` hold, before the first frame overwrites them, the ASCII
`RICK_MASK,Y`, a line break, `!124`, a tab and `S`: a fragment of the
game's own assembler source, left on the developers' machine and saved
with the game.

## Memory layout

| Thing | Where |
|---|---|
| Start-up, the loader's hand-over | `$0810` |
| Main loop | `$0A0A` |
| Rick's movement and actions | `$0B2A`-`$0E63` |
| Sprite images built in software | `$0F83`-`$1177` |
| Enemies | `$11AB`-`$1677` |
| Level and room changes | `$17B7`-`$1966` |
| Objects: boxes, treasure, traps, bonus | `$1990`-`$1D43` |
| Title, story, Hall of Fame, name entry | `$1DCA`-`$2A16` |
| Gun, stick and dynamite | `$2A17`-`$2CCD` |
| Room drawing and vertical scrolling | `$2DA0`-`$3558` |
| Sprite multiplexer | `$3559`-`$38CF` |
| Raster interrupt and its lists | `$39D3`-`$3C09` |
| Objects entering the view | `$3C0A`-`$3ED2` |
| Tile tests | `$3F04`-`$4013` |
| Sound effects and footsteps | `$498C`-`$4F85` |
| Music player | `$5042`-`$5730` |
| Music data (headers, patterns, track lists, instruments) | `$5732`-`$5F8D` |
| Sound effect definitions | `$61C0`-`$65FF` |
| Enemy frames, ten for each level | `$6600`-`$6FFF` |
| Second tile set; story character set | `$7000`-`$77FF`; `$7800`-`$7FFF` |
| Tile colours (two sets); 256 blocks of 4 x 4 tiles | `$8000`-`$81FF`; `$8200`-`$91FF` |
| Level maps; object lists | `$9200`-`$A5BF`; `$A5C0`-`$ACDB` |
| Story texts | `$AD00`-`$B253` |
| Block addresses; frame colours; object arrays; type tables | `$B300`-`$B4FF`; `$B4D0`-`$B57F`; `$B580`-`$B67F`; `$B680`-`$B9FF` |
| Collision map (runtime) | `$BA00`-`$BFB3` |
| Screens (runtime) | `$C000`, `$C400` |
| Sprite image buffers (runtime) | `$C800`-`$C97F`, `$CA00`-`$CB7F` |
| Play tile set, under the I/O area | `$D000`-`$D7FF` |
| Sprite frames | `$C980`-`$C9FF`, `$CB80`-`$CFFF`, `$D800`-`$E3FF`, `$E900`-`$F7FF` |
| Enemy frames of the level (runtime) | `$E400`-`$E8FF` |
| Text and panel font | `$F800`-`$FFFF` |

## Timing

- The main loop at `$0A0A` waits until bit 0 of the frame counter `$07` is
  clear: a step of play every second frame, 25 a second on PAL (*live*:
  over 300 frames the frame's last handler `$3A68` ran 284 times and the
  main step `$0A0F` 141 times).
- The room bonus loses 10 points after 38 main-loop steps and then every 26 (`$0ECF`).
- In play the raster list is `$3B9D` plus `$3A42` (0, 2 or 5, set by the
  sort at `$3559`): line 63 (`$3A43`: the tiles' character set from line
  65, sprite frames, the music and effects at `$4F86`), up to two split
  lines that move with the objects (`$3831`, `$387D`: the bottom of the
  second and of the fourth sprite in height order, Y + 21, plus 3 when the
  two are equal), and line 240 (`$3A68`: sort, place, count the frame).
  The upward scroll uses `$3BA7` (lines 64 and 249, `$3AAB`, `$3AFE`), the
  downward one the handlers at `$3B20` and `$3B73`.
- A scroll takes 16 frames (`$15` from 15 down): the screen shown changes
  every second frame (`$3AE8`: `$C000`, `$C000`, `$C400`, `$C400` by
  `$15` AND 3), the top handler alternately lets the main program draw the
  next shift (`$27`) and moves the objects eight pixels (`$3E55`), and the
  bottom handler copies the colour RAM a row on in every second frame. The
  main loop does nothing else meanwhile (`$3026`).

## Controls

- Joystick on control port 2 (`$4014`). Up jumps (speed -5.5 pixels a
  step, sound 7) or climbs on a ladder; down crouches or climbs down; down
  with a direction crawls. Fire with up shoots, needing the stick let go
  between shots (`$4E`); fire with down lays dynamite; fire with left or
  right jabs with the stick (`$0C92`).
- The game never writes `$DC00`; the port reads `$7F`, so its tests of
  `$DC01` see keyboard row 7 and joystick port 1 together (*live*): ← and
  port 1 down end the game (`$0A95`), Run/Stop pauses (`$40E0`), and with
  the cheat on, 2 or port 1 right refills and C= skips a level.
- *Live*: pushing a joystick in port 1 down during play goes to GAME OVER,
  with no flag needed. The manual's ↑ for quitting does nothing.
- *Live*: Run/Stop stops the main loop (0 steps in 100 frames, `$4106` set)
  until it is pressed again.

## Graphics

- Video bank 3. The play area uses the tile set at `$D000` (`$D018` =
  `$04` from line `$41`, `$3A43`); the score panel and the text screens use
  the font at `$F800` (`$D018` = `$0F` and `$0E`).
- A raster interrupt (`$3A0D`) works through lists of handler numbers
  (`$3B95`); the handlers' lines and addresses are tables
  (`$3BD7`, `$3BE8`, `$3BF9`), and each state of the game points `$02` at
  its own list.
- Sprites: Rick is two hardware sprites (0 and 1); a multiplexer
  (`$3559`) sorts the other objects by Y and reuses sprites 2 to 5 lower
  down the screen for up to four more than the six it has.
- Rick, the dynamite and the enemies in slots 9 to 11 are drawn in
  software (`$0F83`): each frame's 64 bytes are ANDed with a mask built
  from the foreground bit of the tiles behind the sprite (`$1052`), so the
  scenery in front hides them. The images go to two sets of buffers by
  turns (`$C800`, `$CA00`).
- The bullet is a character, not a sprite: `$2ABA` draws character `$FE`
  or `$FF` in white, saving and restoring what it covers, a screen cell
  (eight pixels) a step.
- Rooms are built from 256 blocks of 4 x 4 tiles (`$8200`), eight blocks
  to a map row. Each tile's colour comes from a table (`$8000`), and its
  behaviour from its code alone: eight thresholds (`$38`-`$3F`, `$4081`)
  divide the codes into eight kinds: background, ladders, deadly tiles
  (flag 4; the main loop kills Rick on one, `$0A23`), scenery in front of
  the sprites, platforms in front (flag `$10`: stood on unless rising, `$3F04`, and stopping a climb), springy
  floors (flags `$60`), floors and walls (flags `$48`), and the tops of
  ladders (flag `$80`, climbed down through with the stick held down,
  `$0C38`). The springy kind is codes `$BE`-`$C0` of the first tile set
  and `$D8` of the second; the maps hold 24 such tiles in one row of
  Egypt (map row 86 of level 2) and 4 in Schwarzendumpf Castle (map row
  51 of level 3), none in levels 1 and 4 (counted from the maps).
- The view scrolls two map rows (64 pixels) at a time, as eight one-row
  shifts, when Rick nears the top or bottom (`$3018`, `$30A3`), each shift
  built on the hidden screen while the other is shown, the colour RAM
  copied at the moment of the swap (`$32B0`, `$34C6`).
- The level's enemies are drawn facing right only; `$16D3` makes their
  left-facing frames at each level's start by reversing each row's bytes
  and each byte's pixel pairs.
- The play screen: row 0 the score panel in the font, rows 2-24 the play
  area in tile columns 4-35, character 0 to either side. A view is six map
  rows, 24 tile rows; the screen shows the last 23, the first kept at
  `$BFA0` for the scroll (`$2DA0`; the recorded frame's rows 2-24 equal the
  decoded map rows from `$9220`).
- Rick is a pair of frames, F on sprite 0 (hires, colour 0, `$B5A4`) and
  F+1 on sprite 1 (multicolour, colour 8, `$B5A5`), from `$EB00` and
  `$EB40` for `$AC` (`$0FBC`); `$D01C` = `$FE`. His frames are `$AC`-`$DF`,
  the left-facing ones `$18` after the right; climbing alternates `$C2` and
  `$DA`, its left twin (`$4330`). The story screens' figures are pairs too
  (`$26B1`). The two shared sprite colours are set once, `$D025` = 11
  (`$0936`) and `$D026` = 10 (`$08D2`).
- `$16D3` puts the level's ten enemy frames at `$90`, `$92`, ... `$A2`, each
  followed by its mirror image, and colours them from `$1780` and `$1784`
  indexed by the level number `$30` (X, which picks the frames, holds the
  same, `$243C`). `test_mirror.js` holds the page's port to it.
- The maps use 253 of the 256 blocks (none uses `$D1`, `$FA`, `$FC`): 121
  in levels 1-2 and 132 in levels 3-4. No block in those maps holds 7 codes
  of the first tile set (`$69`, `$CC`, `$CF`, `$D0`, `$D4`, and the bullet's
  `$FE`, `$FF`, which `$2ABA` draws) or 26 of the second (counted from the
  maps).
- `$B400`-`$B4FF`, the blocks' address high bytes, and the frame colour
  table at `$B4D0` share 48 bytes; no frame list names a frame below `$30`.
- Every sprite frame in the bank is named by a frame list or a constant of
  the code; frames `$40`-`$5F` and `$E0`-`$FF` would be the tile set and the
  font.
- The game never reads the sprite collision registers `$D01E` and
  `$D01F`: every hit is a box test in software (`$1C33`, `$1C73`,
  `$1C84`, `$1D2C`).

## Mechanics

- Six lives (`$2D34`, set at `$08C0` in the title loop before every game, *live*: a game after GAME OVER starts with six); bullets and dynamite (`$2D32`,
  `$2D33`) go back to six at every level start and after every death
  (`$09F6`).
- Rick's movement (`$0B2A`): two pixels a step left or right; a vertical
  speed in 256ths (`$39B5`, `$39A9`) to which each step adds half a pixel,
  up to 8; a jump starts at -5.5 (`$0D2D`), 33 pixels up in 11 steps. A
  blocked move is tried without its sideways part; a ceiling turns the
  speed to +0.5, a floor lands him with speed 1 (`$0C20`). On a springy
  floor (flag `$20`) a landing sends him back up at the speed he fell less
  about one pixel (`$0BFE`), or at -8 with up held (`$0BED`, 68 pixels);
  a speed of exactly 1 counts as standing. `test_move.js` holds the page's
  port to the game's code on both floors; the bounce has not been watched
  in play.
- Rick restarts after a death where he entered the room (`$40AA` saves it
  on entry, `lose_life` restores it).
- Enemies (types 4-15, `$11AB`) walk towards Rick's column, climb when he
  is above or below (kind 2), turn at walls, and die to a bullet or the
  dynamite for 50 points; the stick stuns them for 25 steps.
- Traps (types 24-70, `$1A72`; 67-70 reach it through the overlap of the two handler tables) each name what sets them off in four bits
  of their flags: Rick inside the zone, the stick, a bullet, an explosion.
  Set off, a trap plays its sound and runs a movement script of
  (count, X step, Y step) records; bit 3 makes one deadly while it runs and bit 2 while it waits; some
  give 1000 points and go when they end.
- A trap's script (type tables `$B880`/`$B900`) is read from its second
  byte in records of three, count, X step and Y step, ended by `$FF`; its
  frames change every fourth step, a `$FF` going back to the second frame
  (`$1ACF`). A step to X under 4 or from `$E6`, or to Y outside 0-`$13F`,
  ends the run early (`$1B8C`-`$1BC6`). `test_trap.js` holds the page's
  port to the game's code for all 47 trap types.
- The boulder of the first room is trap type 42 (script `$44B6`, nine
  records), object 5 in the play snapshot at X 0, Y 139, blank at rest.
  Its script ends at step 205, at X 40, when its third drop would take it
  below Y `$13F`.
- Boxes of dynamite and bullets refill to six when touched; shot or
  jabbed they explode instead (`$19C6`, `$19FA`). A treasure gives 500
  points (`$1A5F`).
- A room bonus starts at 2000 when Rick touches its start object and
  falls by 10 while he runs to its goal, which pays what is left
  (`$1BCA`, `$1BE7`).
- Objects taken or killed stay gone for the rest of the level (bit 7 of
  their record); after a death only the boxes of dynamite and bullets come
  back (`$3E1B`); at a level's start everything does (`$3DE9`).
- Scoring is BCD in `$42`-`$44`: `$2D3D` adds to the tens and units,
  `$2D36` to the hundreds.

## Bugs

- The multiplexer loses the ninth X bit of its third and fourth reused
  sprites. The sorting code chains the bits from `$3978` to `$397A` and
  `$397B`, then writes the next two to `$3980` (`$368B`) and `$3981`
  (`$36B6`) instead of `$397C` and `$397D`; `sprites_place` then copies
  `$397C` and `$397D`, which nothing writes, over `$3980` and `$3981`
  (`$3725`-`$372E`) before `$387D` reads them. An object shown on reused
  sprite 4 or 5 to the right of X = 255 is drawn at X - 256. Traced
  (`opcodes.py --refs`: no instruction writes `$397C` or `$397D`), not
  seen in play.

## Hall of Fame

- `$21CC` places a new score among the eight; the name is picked letter by
  letter from a grid with the stick (`$1F8C`), ten letters at most.
- A name containing any of eleven four-letter words (`$2181`) becomes
  SNIGGER (`$2103`).
- BBOOIINNGG sets `$53`, the cheat keys. FLUFOMATIC sets `$37`, which turns
  the title screen into a level select (*live*: SELECT LEVEL, 1. SOUTH
  AMERICA, 2. EGYPT, 3. SCHWARZENDUMPF CASTLE, 4. MISSILE BASE, listing the
  levels up to the furthest reached, `$51`). A game started from the
  select skips the ending screen (`$23A0`).
- At power-on `$226A` may copy NOBBY or JEZEBEL over a name, chosen by
  the raster line.

## Levels

- Four levels, 34 room records (`$46AD`, seven bytes each: graphics set,
  map address, exit list, object list); the first 13 use the first tile
  set, the rest the second, swapped in under the I/O area by `$1911`.
- Leaving a room left or right follows its exit list (`$186F`); an exit to
  room zero ends the level. Each level's story screen comes first
  (`$23A0`), and after level 4 the ending, LONDON, MUCH, MUCH LATER, then
  GAME OVER (*live*).

## Data tables

- `$2318`-`$2367`: the Hall of Fame names, column by column; `$2300`-`$2317`
  their scores, three BCD bytes each.
- `$AD00`-`$B253`: the five story texts in ASCII.
- `$B680`-`$B9FF`: seven tables of 128 bytes, one entry per object type
  (hit box, frame list, movement script, kind). At start-up `$4108`
  copies 128 seven-byte records from `$C000`-`$C379` into them; the JSR
  at `$0864` that calls it is then turned into an LDA, so it runs once.

## Sound

- Three systems: a two-voice effect player (`$499C`-`$4E02`, 17 effects of
  64 bytes from `$61C0`), Rick's footstep (`$4F50`, a burst of noise on
  voice 3 for five frames, started at most every eight while he moves), and a three-voice music player
  (`$5042`-`$5730`). A tune silences the effects and footsteps.
- Seven tunes (headers at `$5732`): 0 to 3 the story screens of the four
  levels, 4 the ending, 5 the title and Hall of Fame (`$4F78` restarts it
  when it ends), 6 game over. Tunes 5 and 6 use two voices.

## Unused code

- `$1CB1`-`$1CE7`: a box test like `$1C33` that nothing calls.
- `$2524`-`$253A`: a block-swap loop that nothing calls.
- `$414E`-`$4163`: a routine that writes A as eight binary digits; nothing
  calls it.
- Holding SPACE (or fire on joystick port 1) while a room is built copies
  the map rows above the view onto the bottom of the play area
  (`$2FD5`); *live*, the bottom rows differed with SPACE held.

## Register census

From the code blocks the disassembler traced (`work/census.py`), 12
October 2026. An indexed or indirect write elsewhere would not show here.

| Register | Written or read at | What for |
|---|---|---|
| `$D000`-`$D00F`, `$D010` | `$2732`-`$2747`, `$28EC`-`$2903`, `$3734`-`$37F1` | sprite positions: title, attract, play |
| `$D011` | `$08ED`, `$272D`, `$39E0`, `$3A3A` | screen on and off, raster bit 8 |
| `$D012` | `$0861`, `$3A32`; read at `$226A` | next raster line; a random number |
| `$D015` | `$0885`-`$291A` | sprites on |
| `$D016` | `$0880`, `$09A6`, `$1E92` | multicolour, scroll |
| `$D017`, `$D01D` | `$09BF`, `$09C2`, `$0F4E`, `$23B8`, `$274D` | sprite expansion |
| `$D018` | `$09A1`, `$23C0`, `$2454`, `$3A9B` | character set and screen |
| `$D019`, `$D01A` | `$39E5`, `$3A14`, `$39E8` | raster interrupt |
| `$D01C`, `$D025`, `$D026` | `$0926`-`$28E7` | sprite multicolour |
| `$D020`, `$D021`-`$D023` | `$08A3`-`$2610` | border and background colours |
| `$D027`-`$D02E` | `$1DD7`-`$37F7` | sprite colours |
| `$D400`-`$D418` | `$4990`-`$56D7` | sound |
| `$D800`+ | `$088C`-`$0990` | colour RAM |
| `$DC00` | read only | joystick port 2 |
| `$DC01` | read | keyboard row 7, joystick port 1 |
| `$DC02`, `$DC03`, `$DC0D` | `$081A`, `$081E`, `$39DA` | port directions; CIA 1 interrupts off |
| `$DC04`-`$DC07` | read at `$403F` | timer values mixed into the random number |
| `$DD00`, `$DD02` | `$0847`-`$0854` | video bank 3 |
| `$D01E`, `$D01F` | never | collisions in software |

## The listing's error rate

The first sample, seed 20261013, 45 of the hand-written comments and 20 of
the generated ones, had 11 of 45 and 2 of 20 wrong: callers and the screen
a routine serves (the sprite paths described as the title's when only the
story screens call them), counts, and addresses one off. Those were
corrected, and two checkers then audited all 582 hand-written comments,
correcting 116. The second sample, seed 20261014, drawn after that from
568 hand-written and 793 generated comments, had 1 of 45 hand-written
wrong (`$47` described as a count of steps on the ground; it is a flag),
2 %, with a 95 % interval of 0.4 % to 12 %. It had 6 of 20 generated
wrong, 30 % (10 % to 48 %): two addresses in the enemy-mirroring routine's
comment, and five comments from one template that named the nearest label
before an address as the table holding it, or the nearest routine before
an instruction as the one running it. All seven were corrected, the
template's 321 comments were rewritten to place an address only in an
excluded runtime area or a typed data block that holds it and to name a
routine only when the code runs straight from its entry to the
instruction, and 25 of the self-modified-code comments lost a routine name
for the same reason. Over the whole second sample, 7 of 65, 11 % (5 % to
21 %). The rewritten template was then found to say "reads" for a JMP or
JSR that names a code address; its 53 such comments were corrected to
"jumps to" and "calls".

## Live tests

All from `work/play-level1.vsf` unless named, scripts in `work/`.

| Test | Result |
|---|---|
| `$53` = `$FF`, joystick port 1 right, or key 2 | bullets, dynamite, lives all 6 |
| `$53` = `$FF`, C= | the next level's story screen |
| `$53` = 0, ← | GAME OVER |
| `$53` = 0, ↑ | nothing |
| `$53` = 0, joystick port 1 down | GAME OVER (`live3.py`) |
| Run/Stop, then again | 0 main steps in 100 frames, then 50 (`live2.py`) |
| Checkpoints on `$0A0F` and `$3A68` for 300 frames | 141 and 284 hits: a step every second frame (`live1.py`) |
| `$37` = `$FF`, `$51` = 3 on the Hall of Fame, fire | the level select with four levels (`live1.py`, `rd-hof.vsf`) |
| `$53` set, `$30` = 2, C= twice | EUROPE, EVEN LATER, then the ending and GAME OVER |
| Fire and up, fire and down, up, against no input | a bullet taken and flying; a stick taken and its fuse burning; Y 139 to 128 (`live4.py`) |
| SPACE held while the next room is built | the bottom rows differ from a build without it (`live2.py`) |
