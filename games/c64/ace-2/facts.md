# ACE 2 — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The original Cascade Games disk, labelled v1.1L by the C64 Preservation
Project (`orientation.md`). Everything is in memory at the hand-over
(`$0900`); after that the game reads the disk only for its saved options
and high scores, and writes them back with the drive's block-write
command (`$1E62`, `$1EC4`): options to track 18 sector 2, high scores to
track 18 sector 3. Programmed and designed by Ian Martin, graphics by
Damon Redmond, title music by Rob Hubbard (the title pages, `$6B13`).

## Memory layout

| Thing | Where |
|---|---|
| Entry jump, options record, high-score table and immortal flag | `$0900`-`$098A` (`$0903`, `$0920`, `$0975`) |
| Code | `$098B`-`$654D`, with data inside it: the programmer's message `$51B4`-`$53D3`, the name entry's key table `$5663`, the arming screen's tables `$5939`-`$594E` |
| Tables and text: bank, compass and view tables, the KERNAL vector copy (`$65AE`), the title, security, options and cockpit texts (enciphered, `$6704`-`$6E96`), the cipher (`$6F7F`), the message lists (`$7432`, `$7472`), loadouts (`$74E9`-`$7514`), the enemy's large-picture lookup (`$75B0`-`$7816`) | `$654E`-`$787F` |
| An unused copy of the code at `$3000`-`$377D` | `$7880`-`$7FFD` |
| Two screens, drawn and shown in turn | `$8000`-`$87FF` (VIC bank 2, `$DD00` = `$C5`) |
| Plane two's panel character set | `$8800`-`$8FFF` (swapped with the title font at `$D800` by `$53D4`) |
| Mirror table, horizon edges, sine and cosine, panel screen codes, small font, bank and compass pictures, the map picture (`$9800`), radar templates, sight boxes, tracer masks | `$9000`-`$9FFF` |
| The cockpit views' character sets, drawn into the one not on show | `$A000`, `$A800`, `$B000`, `$B800` (`$B800` is also the full font) |
| An older build's copy of the text and tables, never read | `$C000`-`$C9FF` |
| The loader's leftovers; the options and high-score sectors as read | `$CA00`-`$CBFF`; `$CE00`, `$CF00` |
| The CASCADE logo's title sprites, under the I/O | `$D000`-`$D1FF` |
| The title font, under the I/O | `$D800`-`$DFFF` |
| Music driver and tune | `$E000`-`$ECFF` (driver `$E03F`) |
| Plane two's instrument pictures, explosions, hangar and arming screens, the arctangent table (`$F800`), the KERNAL's zero page (`$F900`), the security grid (`$FA00`), ground target and large enemy pictures | `$ED00`-`$FFF9` |

## Timing

- A PAL frame is the clock: start-up (`$098B`) patches the music step
  into both interrupts as `$FF`, or `$D4` on an NTSC machine (`$02A6` =
  0), and the handlers add it plus one to `$BF`, running the music and
  the clocks on each carry: every frame on PAL, 50 times a second on
  either machine.
- The main loop (`$0CFF`) does plane one's half, plane two's half and the
  shared work (`$11E9`) in a pass of at least one frame. *Live*: 156
  passes in 500 frames of a one-player flight from `play.vsf`, about
  3.2 frames a pass.
- The play interrupt counts the hit shake (`$0254`) down every fourth
  tick, burns fuel, runs the clocks (`$5179`, whose work comes on
  every 50th tick of the music clock, once a second; the title's
  interrupt calls it every frame instead) and turns each plane by its bank (`$5143`), whatever the
  main loop is doing (`$43FC`).
- F3 and F5 act after ten passes held (`$11E9`).

## Controls

- Both joysticks and the keyboard are read by `$366B`. Port 1 shares
  `$DC01` with the keyboard, so the OR of all eight row scans is the
  stick. Outside a game, in a one-player game or when neither pilot has
  planes, port 2 also drives plane one.
- The key flags at `$0200`-`$020D`: RUN/STOP (pause, `$12FF`), X and V
  (map views), C=, S and F (plane one's less and more power), H and K
  (plane two's less and more power), F3 (end the game), Q and T (decoys),
  E and U (select weapon), F5 (music or sound effects).
- Plane two's power keys are the other way round from the manual: K
  raises the throttle and H lowers it (`$0FD8` passes K to `$4252` as
  the more key). Holding a power key moves the throttle by a step that
  grows from 4 to 16 (`$4252`).
- Plane two cannot fire until its sliding weapon selector reaches the
  weapon chosen (`$4C1A`, `$2243`).

## Graphics

- Each pilot has half the screen: plane one rows 0-11 (view rows 0-7,
  panel rows 8-11), plane two rows 12-24 (view rows 13-19, panel rows
  20-24), and the left ten columns are the side panel (`$1C44`). The
  raster chain sets `$D018` and the sprites for each band (`$4902`,
  `$499D`, `$4678`, `$43FC`).
- The cockpit views are multicolour character graphics. Each pass draws
  a view into whichever of its two character sets is not on show, and
  the interrupt flips them (`$6225`, `$4C5C`). The horizon is built
  from edge characters chosen by the bank (`$7071`-`$7131`); the ground
  is blue over the sea and yellow over land (`$14AF`,
  `$46D4`).
- The enemy is drawn by distance (`$2C86`): an empty cell at range 6 or
  more, one or two dots at 2 to 5, a medium picture of two cells, and at
  the nearest a large picture of three cells chosen from its heading,
  roll and pitch against ours through four lookup tables (`$7678`,
  `$7648`, `$7608`, `$75B0`).
- The instruments are drawn into the panel character sets: radar
  (`$1922`, copied to `$03A0` and plotted each pass), pitch ladder,
  bank indicator and compass (`$1A28`, `$1AF9`), bars for power and fuel
  (`$3488`, `$349D`), and the two-line message panel in a five-row font
  (`$17D1`, `$9500`).
- Explosions are sprites 6 and 7, their pictures copied in from twelve
  shapes at `$F026` (`$4DB2`).

## Mechanics

- **Flight** (`$4252`). Thrust is the throttle less the bank, halved
  below `$C0` (75 %), times 126 plus the altitude / 512, over 256. Drag
  is the weight `$69` times the speed / 8, over 256. Half the difference
  changes the speed. The climb rate is the speed times a fraction by
  the pitch (`$740C`).
- **Weight** (`$282F`): from the missile stocks and plane one's fuel / 64,
  used for both planes.
- **Limits** (`$5A1C`): below speed 140 STALL WARNING and the nose
  pushed down; above 58,880 feet CEILING 60000; on the ground with the
  nose off level a crash, or with crash detection off PLANE CRASHED and a
  recovery.
- **Weapons** (`$23E0`, `$2243`). A missile needs a lock: the enemy in
  range (8 for the heat seeker, 25 for the radar missile, 4 and below
  2,304 feet for the air-to-ground missile) and boxed for ten passes.
  The radar and air-to-ground missiles need the box kept on the target.
  Top speeds 250 and 255 (`$7860`); lives 14 and 40 ticks (`$265B`). The
  cannon hits one pass in four while the enemy is in the sight and drawn
  medium or large (`$181B`, `$1769`).
- **Decoys** (`$2531`, `$265B`). Six flares and six chaff (`$208E`).
  Chaff turns a radar missile with a chance of 180 in 256 (200 for the
  human's missile against the computer); a flare within 2 turns a heat
  seeker with 220 in 256 (230 plus the skill level against the
  computer). A turned missile goes `$30` off course at half speed.
- **Damage** (`$27FB`, `$2531`). A missile does 255, 128 or 96 by the
  MISSILE HITS TO KILL option (`$7009`), a cannon hit 20. Damage 255
  kills; below 4,864 feet a kill may be a spin first (`$282F`).
- **Scoring** (in tens, `$1C25`): 20 a cannon hit (`$181B`), 50 a missile
  hit (`$2531`), 200 a kill (`$282F`), 2,000 a ground target, which
  burns for 29 passes first (`$250C`).
- **Landing** (`$3D57`, `$1FAD`). A plane is held at its own edge of the
  map (west for plane one, east for plane two); below 1,024 feet with
  the nose near level OK FOR LANDING, and with the wings level it lands
  and is refuelled, rearmed and repaired (`$208E`).
- **The full-scale game**: two ground targets (`$308C`), each shown only
  over its own kind of ground (`$14AF`), defended by surface-to-air
  missiles (`$64CD`). A pilot wins when the other has no planes and its
  target is gone (`$64B4`).
- **The computer pilot** (`$5B47`): every other pass, three times in four
  it throws 0-21 and acts only below the skill level; it meets missiles
  first, then follows a plan (`$5C43`) and a close-combat move drawn at
  random (`$5D30`).
- **The security check** (`$37E1`): three tries, a random square from 40
  at `$FA00`; light green counts as green and cyan as blue. A right
  answer overwrites the check's own code with random bytes; a third
  wrong answer fills `$0100`-`$CFFF` with one random byte and jumps into
  it.
- **The hamster** (`$5634`, `$0975`): a name entry beginning DUSTY BU
  sets the immortal flag, which nothing clears and which is saved with
  the high scores (`$1F30`). With it set plane one burns no fuel
  (`$43FC`), cannot die (`$27FB`) and the side panel shows IMMORTAL.
- **The NMI repair** (`$6066`, `$2AA6`): twice a frame two bytes of the game
  are broken and a CIA 2 timer's NMI puts them back a few cycles later.
- **Never shown**: messages 12 (YOU TRAITOR) and 19 (a first TARGET
  LOCKED); no caller of `$34F8` passes them.
- **The chaff bug** (`$25EF`): with no chaff left, plane two is moved by
  a fraction of a map square.

## Data tables

| Table | Where |
|---|---|
| Options record (17 bytes, signature OPTIONS) | `$0903` |
| High scores (signature HIGHSCORES, five words in tens, five names, the immortal flag) | `$0920`-`$0975` |
| Text cipher | `$6F7F` |
| Cockpit message lists, 32 each | `$7432`, `$7472` |
| Loadouts: dogfight and full-scale for each plane; the computer's two choices | `$74E9`-`$7508`; `$7509`, `$750F` |
| Missile damage by the hits option | `$7009` |
| Missile top speeds | `$7860` |
| Turn rate by bank; by stick | `$6ED6`; `$6EE6` |
| Map picture, 30 × 12 | `$9800` |
| Arctangent, 256 entries in 256ths of a turn | `$F800` |
| Security grid, 40 squares × 4 bytes | `$FA00` |

## Sound

- The music driver (`$E03F`) runs on the music clock while `$4EAD` is
  `$40`: three voices, each following a track (`$E6CE`, `$E712`,
  `$E7CB`) of patterns (38, pointers at `$E682`/`$E6A8`). A note step
  falls three times in eight calls, 18.75 steps a second. Eleven
  instruments in two tables (`$E5CB`, `$E624`) give waveform, envelope,
  pulse sweep, vibrato and effects; drums are waveform and pitch tables
  (`$E5A2`, `$E9A9`, `$EB0A`). The bass on voice 3 uses the filter
  (`$D417` = `$F4`, `$D418` = `$1F`). Note frequencies: 96 notes from
  C0 (`$E48A`).
- *Live*: the tune runs 5,880 steps, 15,680 calls (5 minutes 14
  seconds), before it starts again (`work/verify/music_len.js`).
- The sound effects (`$4EAE`) run each frame while `$4EAD` bit 7 is set:
  the engines' pitches by each throttle (`$62A5`) over noise on all
  three voices (`$4DFB`, started again when a plane is killed or lost),
  and the engine winding up in the hangar. F5 swaps
  the music and the effects during a game (`$11E9`).

## The listing's error rate

One sample, seed 2510251, drawn from 924 comments in two strata: 818
written by hand and 106 written by scripts from the bytes (the colour
RAM's comments under `$D800`-`$DFFF` and the music's patterns). 80 were
drawn, 60 from the first and 20 from the second, and checked by one
checker on claude-opus-5-5[1m] with `kit/skills/core/60-verify/checker.md`.
Every verdict of wrong was read against the code: all twelve held, all
among the 60 written by hand. The plain rate for the hand-written
comments is 12 of 60, 20 % (95 % interval 11.8 % to 31.8 %); none of the
20 generated was wrong (interval 0 % to 16.1 %); weighted by the strata's
sizes, about 17.7 %. That is over the mark, and is a lower bound on the
true rate. None was wrong outright; each was wrong in a detail: a
caller list that missed the start-up copy and the damage routine
(`$0975`); the menu cursor's wait taken to depend on the stick, where it
depends on a byte only the computer's escape sets (`$1363`); page `$97`
given as both planes' tables, where it is plane one's (`$19A1`); the
attitude bytes given only one reader, where the plane's own view reads
them too (`$30AC`, with `$6582`); a colour routine's rows, which take in
the top row of the panel below (`$312B`); a sound routine taken for
voice 3's, where it gates all three with noise and is also the
explosion's (`$4DFB`, renamed `noise_start`); the clocks given a
second on the title, where they run every 50 frames (`$5179`, with
`facts.md`'s timing); every string taken to end in `$FF`, where the side
panel's are fixed fields, and Z given a column name it lacks (`$675E`,
with `$675F` and the cipher at `$6F7F`); two bytes placed after the
wrong picture (`$9EC6`); the message panel's columns, off by one
(`$A305`, with plane two's at `$8AA0`); a character set's first 26
characters called letters, where ten are digits and one a blank
(`$A800`, with the sets at `$A000`, `$B000` and `$B800`); and an
instrument's first note given two frames, where the other effect's
countdown leaves it one (`$E435`). All twelve and the seven comments
that repeated them were corrected.

## Live tests

All in the kit's machine (`kit/c64/machine.js`) or CPU (`kit/cpu/cpu6502.js`)
from the snapshots in `work/`, scripts in `work/verify/`.

- The tune's length: the driver called from the snapshot until its
  state repeats: 5,880 steps.
- The hamster (`live1.js`, `live2.js`): over 300 frames of `play.vsf`
  plane one's fuel (`$0284`) fell from 247 to 245 with `$0975` clear and
  stayed at 247 with it set; with it set the side panel printed the
  IMMORTAL string (`$6BC3`, through `$18E0`) between PLANES and SCORE.
- The NMI repair (`live1.js`): 600 NMIs in 300 frames of play, two a
  frame, with `$43FC` and `$16E9` holding `$85` and `$EA` at the end. With
  the NMI vector pointed at an RTI the two bytes stayed broken (`$86`,
  `$60`).
- The chaff bug (`chaff.js`): `$2531` called for pilot one with no chaff
  and a radar missile in flight reached `$25EF` with X = 11 and changed
  `$0293` from 0 to 255 and `$0297` from 252 to 8; pilot one's chaff and
  timer did not change.
- The security check: square DD 5 accepted orange (8), the colour in
  `$FA00`'s entry for it.
- Passes: 156 in 500 frames of play.
