# Encounter — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

No build identifier or version string exists in the image. The program
is Novagen's C64 release (the title screen says © 1984 NOVAGEN SOFTWARE
and BY PAUL WOAKES); whether this particular file is a crack is
unknown. The image carries a cartridge-style signature: $8000-$8003 hold the vector $9C3E twice and $8004 the text CBM80, so a hardware RESET restarts the game instead of returning to BASIC. Signs that the copy was worked on: the "only levels already
reached" test at $9CE3 is followed by two `NOP`s where a branch would
be, and seven unexplained bytes at $9FF9 are executed on every game
start (see Oddities). The loader residue at $097D programs a CIA timer
and points the IRQ at $0A5E, which reads like the remains of a tape
loader; nothing in the game references it.

## Memory layout

| Thing | Where |
|---|---|
| Loader relocation stub (dead after boot) | $0960-$097C; residue $097D-$0A5F |
| Per-object working tables (32 or 96 entries each) | $1400-$17BF, see Data tables |
| Small runtime block copied at init from $3E00-$5FFF | $1E00-$3FFF (only $1400-$17FF and the $2xxx twins are used) |
| View character buffer A, sky half / ground mirror | $4000-$47FF / $4800-$4FFF (`$D018` = $80 / $82) |
| View character buffer B, sky half / ground mirror | $5000-$57FF / $5800-$5FFF (`$D018` = $94 / $96) |
| Play screen A: status row 0, view rows 2-17, console rows 18-24 | $6000-$63E7, sprite pointers $63F8 |
| Play screen B (view rows only) | $6400-$67E7, sprite pointers $67F8; sprite images at $6700 (gun sight), $6740 (ground strip) |
| Title screen, prebuilt, with hidden data in rows 5, 7, 13, 20-21 | $6800-$6BE7 (`$D018` = $AE) |
| Game-over screen, prebuilt | $6C00-$6FE7 (`$D018` = $BE) |
| Sprite images (scenery, saucer) | $7000-$77FF, pointers from $8F40 |
| Character set: fonts, console, logo | $7800-$7FFF |
| Scene records, sound loops, object arrays, maths tables, level tables, score, zero-page image, shape scripts | $8000-$9BFF, see Data tables |
| Init, title, game start | $9C00-$9FFF |
| Main loop, enemy state machine, warp, spawning, scoring | $A000-$AA6F |
| Console lights, enemy behaviour dispatch, end of frame, death, game over, obelisk collision, player shots, hit test, shape renderer | $AA70-$B19F |
| Frame swap, ground mirror, raster interrupt chain, per-frame timers, multiply, turning | $B1A1-$B507 |
| Player movement, object motion, bearing and range, view list, drawing order, BCD score | $B508-$B8E0 |
| Status digits, scene apply, scenery sprites, stargate rectangle, random, joystick, edge tables | $B8E1-$BDFD |
| Never written (emulator fill pattern) | $BDFE-$BFFF, $C000-$CFFF |
| Zero page $02-$A1 | game variables, initialised from the image at $8B00 by $9C43 and again by $9E82 (see Data tables for the map) |

`$01` = $36 throughout play: BASIC ROM out, KERNAL and I/O in. The
KERNAL is used for `IOINIT` at init and `SCNKEY` on the title screen
only. VIC bank 1 (`$DD00` = $96).

## Timing

PAL machine; the emulator was set to PAL and the game checks for it
($9DEC, see Oddities). One game frame per raster frame: the main loop
waits at $A181 for raster line $C0 (192), which is just before the
console interrupt at line 194, and the seven-stage raster chain runs
once per frame (309 hits in six seconds, live). The CIA interrupts are
disabled ($9F16), so there is no timer tick. Frame counter $1B advances
in the line-194 stage ($B45F); $58 counts its wraps (256 frames, about
5.1 s) and is reset by a kill, a shot or a pause. Colour blending flips
each frame between the two nibbles of a colour pair ($B467), a 25 Hz
flicker. Player turn steps are 2 units on the first frame and then $25
per frame (10 at level 1) out of 2048 for a full circle ($B4D8). Player
shots live 24 frames ($ACB6); the fire lock is 8 frames ($5C); a
destroyed enemy's fragments and explosion colours run off the lifetime
of object 24 ($83F8).

## Controls

Joystick in control port 2, read at $BC31 from `$DC00` with the data
direction register cleared. Bits 0-3 are up, down, left, right and bit
4 is fire, all active low; the nibble goes to $6D and the fire bit to
$6E. Up moves forward ($B508), down moves in reverse ($B56C, a 180°
heading flip at the same speed), left and right turn ($B4F0/$B4D8);
diagonals therefore turn while moving. Fire launches a shot ($ACB6) when
$AE allows it, $69 is zero (no gate phase) and the fire lock $5C has
expired; holding fire repeats. During the attract demo ($71 ≠ 0) the same
routine replays a script of (joystick byte, frame count) records from
$7400 instead of the port.

Keys are scanned by the KERNAL `SCNKEY` on the title screen and read as
matrix codes from $C5: F7 (3) starts, F5 (6) cycles skill ($62: 0 EXPERT,
1 ADVANCED, 2 NOVICE, the default), keys 8..1 (table at $6931) select the
level. Joystick fire also starts a game from the title ($9D13). In play,
$9E23 reads keyboard column 0 directly: F1 ($EF) aborts to the title
($A118), and SPACE (row scan at $A12A) pauses; the pause loop at $A13B
ends on any joystick direction, not on SPACE.

## Graphics

**A text screen with a hardware-drawn horizon.** The whole picture is
character mode. The raster chain repaints `$D021` at lines 16, 66, 121,
125, 128, 130 and 194 from zero-page colours ($BB, $BC, $BD, $BE, $AD),
giving a black status band, the sky, a three-line horizon gradient, the
ground and a black console, without any pixels for the sky or ground.
Lines 66-194 are shown in multicolour text mode (`$D016` = $18) and the
rest in hi-res.

**Objects are composited into characters.** Every object has 32
pre-scaled scripts per family ($9600/$9700 pointer tables, index =
family × 32 + size) that describe it row by row as runs of solid fill
cells and edge cells. The renderer ($AD76) writes fill cells as one of
four fixed characters ($00/$20/$40/$60, textures 00/55/AA/FF) and builds
every edge cell as a freshly allocated character ($B035 hands out codes
$80, $A0, $C0, $E0, $01, $21, ...) whose eight rows are composed from
2-pixel-pair AND masks and OR patterns ($BC85/$BD05) picked by a profile
row table ($8FC0 or $9800). The bitmaps go into the character buffer for
the frame being drawn.

**Double buffering and a free reflection.** Frames alternate between
screen $6000 + characters $4000 and screen $6400 + characters $5000 ($08
bit 0, $B1A1). After the objects are drawn, $B1EC copies screen rows 2-9
into rows 17-10 with every code EOR $FF and writes a byte-reversed copy
of the allocated characters into the +$800 charset; the raster stage at
line 130 switches `$D018` to that copy. The ground half of the view is
therefore the sky half upside down, and every object has a reflection
for the cost of a copy.

**Sprites.** Sprite 0 is the radar blip, placed by a polar-to-cartesian
conversion at $AB21 and clamped to the scanner box. Sprite 1 is the gun
sight, fixed at X $A0, Y $6D, expanded both ways. Sprites 2-7 are the
scenery: a horizon hill strip (sprite 2, Y 109) and clouds, each with
four images ($8F40) chosen from bits 9-10 of the view heading and
scrolled against it ($B9A5), which is what makes the horizon turn.
Sprites 24-31 in the object table are explosion fragments (objects, not
hardware sprites). No sprite is multicoloured.

**Console.** Rows 18-24 of screen $6000, drawn once. The three lamps on
each side are five colour-RAM cells at columns 7-11 and 28-32 of rows 19,
21 and 23, recoloured by $AA70: row 21 turns yellow (7) when a saucer
launches and back to orange (8) when it is gone; row 23 turns light blue
($0E) when a saucer fires for $12 frames; row 19 alternates red and pink
(2/$0A) while a homing missile is live.

## Hardware register census

Every access to the I/O page in the code disassembled so far (5.8 KB of
code at the time of the sweep; re-run when the burn-down finds more).
Each `?` in the last column is a work item: the routine it belongs to
and the feature it serves.

Registers never touched are as telling as those hammered: no `$D01C`
(sprite multicolour), so every sprite is hi-res; no `$D00x` sprite
positions for sprites 0 and 1 other than the fixed writes at $9F31/$9F36
and $9E04-$9E09, so they are set up once; no `$D01E` (sprite-sprite
collision), only `$D01F` (sprite-background) at $9D70 and $9E1F; no
`$DC04`-`$DC07` timer writes in the game proper (the only ones are in the
loader residue at $09B2), and `$DC0D = $1F` at $9F16 disables every CIA1
interrupt source, so the raster chain is the only interrupt in play; `$DD00` is written once at init ($9C56).

| Register | Meaning | Accesses | Where | Routine / feature |
|---|---|---|---|---|
| `$D002` |  | sta ×1 | $9F36 | ? |
| `$D003` |  | sta ×1 | $9F31 | ? |
| `$D004` |  | sta ×1 | $B9CF | ? |
| `$D005` |  | sta ×1 | $B9EB | ? |
| `$D006` |  | sta ×1 | $9E04 | ? |
| `$D007` |  | sta ×1 | $9E09 | ? |
| `$D010` | sprite X MSBs | sta ×2 | $9E0E, $BA00 | ? |
| `$D011` | control 1 | sta ×1 | $9EE2 | ? |
| `$D012` | raster compare | lda/sta ×9 | $9F11, $A181, $B30F, $B340, $B366, $B38C, $B3B2, $B3DC, $B40D | ? |
| `$D015` | sprite enable | sta ×3 | $9D95, $9E11, $B93C | ? |
| `$D016` | control 2 | sta ×3 | $9DA7, $B328, $B3F7 | ? |
| `$D017` | sprite Y expand | sta ×2 | $9E14, $B937 | ? |
| `$D018` | memory pointers | sta/stx ×5 | $9CCD, $9DDD, $B325, $B3C8, $B3F2 | ? |
| `$D019` | IRQ status | sta ×8 | $9F1E, $B314, $B345, $B36B, $B391, $B3B7, $B3E1, $B412 | ? |
| `$D01A` | IRQ enable | sta ×2 | $9D98, $9F21 | ? |
| `$D01B` | sprite priority | sta ×1 | $9EE7 | ? |
| `$D01D` | sprite X expand | sta ×2 | $9E17, $B932 | ? |
| `$D01F` | sprite-background collision | lda ×2 | $9D70, $9E1F | ? |
| `$D020` | border colour | sta ×2 | $9DD5, $9FEE | ? |
| `$D021` | background 0 | sta ×8 | $9DD8, $B300, $B32D, $B357, $B37D, $B3A3, $B3CD, $B3FC | ? |
| `$D022` | background 1 | sta ×2 | $B471, $B497 | ? |
| `$D023` | background 2 | sta ×2 | $B46C, $B48E | ? |
| `$D027` | sprite 0 colour | sta ×1 | $9F27 | ? |
| `$D028` | sprite 1.. colour | sta ×1 | $9F3E | ? |
| `$D02A` | sprite 3 colour | sta ×1 | $9E1C | ? |
| `$D400` | voice 1 freq | sta ×6 | $9CEC, $9D8F, $A010, $A0A9, $ACDB, $B54B | ? |
| `$D401` |  | sta ×6 | $9CEF, $A013, $A0AC, $ACDE, $B43C, $B54E | ? |
| `$D402` |  | sta ×1 | $A02C | ? |
| `$D403` |  | sta ×1 | $A037 | ? |
| `$D404` | voice 1 control | sta ×10 | $9CF4, $9CFC, $A01E, $A0B6, $A0BB, $ACE8, $ACED, $B441, $B558, $B55D | ? |
| `$D405` | voice 1 AD | sta ×4 | $A0B1, $ACE3, $B423, $B553 | ? |
| `$D406` | voice 1 SR | sta ×2 | $9DA2, $A023 | ? |
| `$D407` | voice 2 freq | sta/stx ×2 | $A0EE, $A1C7 | ? |
| `$D408` |  | sta/stx ×2 | $A0F1, $A1BD | ? |
| `$D409` |  | sta ×1 | $A02F | ? |
| `$D40A` |  | sta ×1 | $A03A | ? |
| `$D40B` | voice 2 control | sta/stx ×4 | $A0FB, $A100, $A1B5, $A1D1 | ? |
| `$D40C` |  | sta ×1 | $A0F6 | ? |
| `$D40D` |  | sta ×1 | $A018 | ? |
| `$D40E` | voice 3 freq | sta/sty ×2 | $A1CA, $A1E2 | ? |
| `$D40F` |  | sta/stx ×4 | $A165, $A1C2, $A1DF, $B45C | ? |
| `$D410` |  | sta ×1 | $A032 | ? |
| `$D411` |  | sta ×1 | $A03D | ? |
| `$D412` | voice 3 control | sta ×2 | $A1B8, $A1E7 | ? |
| `$D414` | voice 3 SR | sta ×1 | $A01B | ? |
| `$D417` | filter resonance/route | sta ×1 | $A040 | ? |
| `$D418` | volume/filter mode | sta ×2 | $9D9D, $A045 | ? |
| `$DC00` | CIA1 port A (joystick 2 / key columns) | lda/sta ×3 | $9E2A, $A131, $BC31 | ? |
| `$DC01` | CIA1 port B (key rows) | lda ×2 | $9E2D, $A134 | ? |
| `$DC02` | CIA1 DDR A | sta ×5 | $9CC5, $9D59, $9E25, $A12C, $BC2E | ? |
| `$DC0D` | CIA1 interrupt control | lda/sta ×2 | $9F16, $9F19 | ? |
| `$DD00` | CIA2 port A (VIC bank) | lda/sta ×2 | $9C4F, $9C56 | ? |

## Text and character sets

The game runs in VIC bank 1 ($4000–$7FFF) with one text character set and
draws all its text in a private alphabet. Neither font is in screen-code
order, so a byte search for PETSCII or screen-code text finds nothing.

**Small font, character set at $7800** (`$D018 = $8E`, `$8F`, `$AE`, `$BE`:
the same character set with the screen at $6000, $6800 or $6C00). Glyphs are 7 pixels wide with a blank
eighth column:

| Code | Glyph |
|---|---|
| $00–$09 | digits 0–9 |
| $0A | space |
| $0B | full stop |
| $0C | © |
| $0D–$26 | letters A–Z (A = $0D, Z = $26) |
| $27 | a right-hand vertical bar |
| $28–$7F | scenery patterns (clouds, horizon, dither) and shapes; not text |

**Wide font, same character set, codes $80–$CF.** Every character is a
pair of adjacent glyphs, left half then right half, so text in this font
occupies two screen cells per letter and is always at an even code:

| Code pair | Glyph |
|---|---|
| $80/$81 … $92/$93 | digits 0–9 (digit n = $80 + 2n, $81 + 2n) |
| $94 | blank (single cell) |
| $96/$97 | a dotted leader, as in SCORE . . . . |
| $98/$99 | © |
| $9A/$9B … $CC/$CD | letters A–Z (letter n = $9A + 2n, $9B + 2n) |
| $CE, $CF | blank, and a vertical bar |
| $D0–$EF | console panel: blocks, corners and the light and radar frames |
| $F0–$FF | diagonal and solid fills, used by the ENCOUNTER logo |

Both tables were derived by rendering the glyphs from the snapshot at
$7800 and reading them, then checked by decoding the title screen at
$6800 (BY PAUL WOAKES, © 1984, NOVAGEN SOFTWARE, SCORE, LAST SCORE,
HIGH SCORE, EXPERT ADVANCED NOVICE, F5 NOVICE, F7 BEGIN GAME) and the
status row of the play screen at $6000 (`0000000 L1 E15 54`), which read
correctly.

**The view rows use their own character buffers.** `$D018 = $8E` and
`$8F` both select the character set at $7800 (bits 3-1 = 7). The raster
interrupt switches the 3D view rows (2-17) to `$D018 = $80/$82` or
`$94/$96`: screen $6000 with characters at $4000 (sky half) and $4800
(ground half), or screen $6400 with $5000 and $5800, a double buffer
picked by bit 0 of the frame counter $08. Those characters are built
every frame by the column drawer ($B053/$B10D) from the column-shape
tables at $9800-$9B80, and the ground half is the sky half reflected: the
screen rows are copied 2..9 into 17..10 with the codes EOR $FF and the
charset is byte-reversed into the +$800 copy ($B1EC). The block at $7000
is not a character set at all; the sprite pointers at $63F8 point into it
and into $6400-$67FF ($6700 the gun sight, $7280 a saucer disc).

**Stored text.** The title screen ($6800–$6BE7) and the game-over screen
($6C00–$6FE7) are kept as complete, pre-built 1000-byte screens in the
wide font and shown by switching `$D018`; there is no separate string
table for them. The only small-font strings are the three skill names,
8 bytes each, at $84E2: `  EXPERT`, `ADVANCED`, `  NOVICE`. A sweep of
the whole RAM image for runs of five or more characters in either font
found nothing else that reads as words (the other hits are ascending or
descending byte tables that happen to fall in the letter range).

## Mechanics

**Objects.** 96 slots indexed by X: 0 player; 1, 4, 5 player shots; 2
the current enemy; 3 the stargate; 6 a marker used for the radar
conversion; 7 the warp-in flash; 8-23 enemy shots (and warp spheres);
24-31 explosion fragments; 32-95 the 64 obelisks. Each has a state
($83E0: 0 inactive, $FF permanent, else a lifetime counted down every
frame by $B584), a type/shape byte ($8440: bits 7-5 family, bits 1-0
texture), an 11-bit heading ($84A0 octant, $84C0 fine), a speed ($17A0)
and a 24-bit X and Y position ($8260/$82C0/$15C0 and $8320/$8380/$15E0).
$B5A1 turns heading and speed into a velocity through the quarter-sine
table at $8900; $B65D adds it.

**The plain.** Obelisks sit on a 32-unit grid; $8A00 is a 16×16 map from
grid cell to obelisk index, used by $AC30 to stop shots and enemy shots
and by $B50C to stop the player: a move is refused when the nearest
object in the travel direction is within $43 units ($90), and the game
plays a bump noise ($B53F).

**Seeing.** Each frame $B77F walks every object, culls to a ±$60 box,
computes bearing and logarithmic range ($B729/$B766 via the reciprocal
table $8500, arctangent $8600 and hypotenuse adjustment $8700), and
builds a view list ($1460) sorted nearest-last ($B829). $B86C draws it
far to near so nearer objects overwrite. The size index comes from
range through $8800.

**Enemies.** Between enemies ($A28A) a countdown $4D (random 8-39
frames, $A962) spawns the next: a homing missile ($A3A5) when $33 says
one is pending, when the player has idled 24 × 256 frames, or one time
in four while a saucer flag is set; otherwise a saucer ($A42C). Saucer
type $7A is random in 0..2×level-1 (16 types at level 8), except that the
first two spawns after a level-up are the two newly unlocked types
($9E). Each type has a fire script at $8C00 (delay, spread pairs) and
one of four behaviour routines ($AAB5 table): default, burst fire,
script fire, permanent fire. Saucers reroll speed and heading from the
difficulty ($3B, ramping to $3F) and leave after 24 × 256 frames.
Missiles steer toward the player ($A7F0) and whine on voices 2 and 3 with
pitch from range $31.

**Hits.** $AD26 tests an object against the player by bearing and range:
range under $80 is a hit, over $C0 a miss, and in between a hit only if
the bearing jumped by $57 or more between frames (the object crossed the
player). Player shots are tested against the enemy at $A894. A kill
($A8B2) awards 500 for a missile or (type+1) × 100 for a saucer (table
$8BB0), paid level times over ($A1 at $AAC8), decrements the enemy count
$8BA8 (BCD, rolled 10-19 per level at $AA8F), spawns 8 fragments and, at
zero, opens the stargate and adds a shield.

**Shields.** The count is the wide-font digit at $6026/$6027: "S4" at the
start ($9F89), plus one at the last kill of a level, capped at 9
($A91D), minus one on death ($ABDC). Death ($AB9A) flashes the screen,
then restarts the level through $9FA4; a zero count goes to
$ABED, which moves SCORE to LAST SCORE on the title screen, updates the
high score, and shows the game-over screen ($9C5C).

**Stargate and warp.** The gate is object 3, placed at the last enemy's
X ($A2A1) for $F0 frames. Flying into it ($A4EC, tested with $AD26)
starts the warp ($A713): the scene switches to the warp colour block
($63 = $80), speed ramps by $A5 toward the level's top speed ($A7E8),
and spheres appear in slots 8-23 every three frames. After about four
256-frame periods the level completes ($A798): the level digit
increments and $68CB records the highest level reached. Missing the gate
returns to play with a new enemy count ($A552); no shield loss was found
on that path, and a sphere hit uses the same death routine as a missile.

**Levels.** Level n selects scene record n ($8010 + $63, 16 bytes to
$AB-$BA: sprite enable/expand and the five band colours, odd levels a
coloured sky and even levels black) and a 64-byte scenery record
($9840 + $63 × 8: sprite Y positions, image pointers, positions). The
level index counts down: level 1 is $70, level 8 is $00, warp is $80.
Skill ($62) picks a column of the eight parameter tables at $8F80
(difficulty base $3B, player speed $68, enemy speed, enemy-shot speed
$A6, collision threshold $57, $4F, turn rate $25, warp bonus $A9);
column 3 is the demo.

## Data tables

Addresses are where the code reads them in the play snapshot. Object
arrays are indexed by object number (0-31, obelisks 32-95 where the
array is 96 long).

**Object arrays**

| Table | Length | Holds |
|---|---|---|
| $83E0 | 96 | state: 0 inactive, $FF permanent, else frames left |
| $8440 | 96 | type: bits 7-5 shape family ($00 obelisk, $20 shot, $40 saucer, $E0 gate), bits 1-0 texture |
| $84A0 / $84C0 | 32 | heading octant (0-7, clockwise from +Y) and fine angle; entry 0 is the player's view heading |
| $8260 / $82C0 / $15C0 | 96 | X position high, middle, low |
| $8320 / $8380 / $15E0 | 96 | Z position high, middle, low |
| $17A0 | 32 | speed; entries 24-31 fixed at $10 |
| $1600 / $1620 / $1640 | 32 | X velocity, three bytes |
| $1660 / $1680 / $16A0 | 32 | Z velocity |
| $16C0 / $16E0 / $1700 / $1720 | 32 | previous position, restored after an obelisk collision |
| $1400 | 32 | size step this frame (from $8800 by range) |
| $1460 | 32 | view list, nearest last; count in $0F |
| $14C0 / $1520 | 32 | bearing octant and fine bearing this frame |
| $1580 / $15A0 | 32 | bearing seen by the hit test last frame, and its invalid flag |
| $1740 | 32 | logarithmic range code |
| $8460 / $8480 | 32 | set to 3 for every object at game start; no reader found (unknown) |

**Level and scene data**

| Table | Holds |
|---|---|
| $8010 | nine 16-byte scene records copied to $AB-$BA: sprite expand X, expand Y, enable, then colour pairs for `$D023`, `$D022`, sky, ground and the three horizon lines. Record index = level index ($70 = level 1 ... $00 = level 8) and $80 = warp. Odd levels have a coloured sky; even levels a black one |
| $9840 + index × 8 | 64-byte backdrop record per level: sprite Y positions, image pointers and the heading at which each of four images is chosen, loaded into $8F40-$8F7F by `apply_scene` ($B920) |
| $8F80 | eight 4-byte skill tables, one column per skill (0 expert, 1 advanced, 2 novice, 3 demo): difficulty base $3B, player speed $68, enemy speed, enemy-shot speed $A6, hit tolerance $57, obstacle range $4F, turn rate $25, warp bonus $A9 |
| $A7E8 | warp top speed per level, $50..$A0 |
| $A7E0 | eight warp-sphere shape numbers |
| $8C00 | enemy fire scripts: start offset per saucer type, then (delay, spread) pairs ended by $FF and a restart offset |
| $8EC0 / $8F00 / $8FC0 | saucer behaviour flags, speed and hover value by difficulty index |
| $8E00 / $8E40 / $8E80 | missile speed and two parameters by difficulty index |
| $8CE0 / $8CF0 | saucer colours by type; explosion colour pairs, from brown/brown to white/white, indexed by fragment lifetime |
| $8A00 | 16 × 16 map from plain cell to obelisk object number (0 = empty) |
| $8BB0 | points by saucer type, 100 to 1600 in steps of 100; $8BAC = 500 for a missile |

**Maths tables** (256 bytes each): $8500 reciprocal, $8600 arctangent,
$8700 hypotenuse adjustment, $8800 range to size step, $8900 quarter
sine. $8D00 scales the stargate rectangle by range.

**Shapes.** $9600 (low) and $9700 (high) hold 256 script pointers,
index = family × 32 + size step. Scripts live at $8FC0-$95BF (wide
profile rows, eight tables of 192) and $9800-$9BFF (narrow profile
rows, interleaved with the backdrop records). Edge cells are built from
the 2-pixel-pair mask and pattern tables at $BC85/$BCC5 and $BD05/$BD45
(32 coverage groups × 4 textures), with fixed fills $BC81 (00/20/40/60)
and textures $BD81 (00/55/AA/FF).

**Sound loops.** $80A0 voice 3 pitch loop; $80C0 selects a voice 1
sequence; $80C8 voice 1 pitch loop.

**Screens and templates.** $8120 is the status row template
(`0000000 L1 E25 S4`) and $8148-$825F the seven console rows; no code
in the image copies them, so they are either loaded straight into
$6000-$63E7 by the depacker or left over from one that did. $6800 and
$6C00 are the title and game-over screens. The title screen hides data
in rows the colour table blanks: $68C8-$68CB (heading-alignment chance
$68C8 with its default $68C9, and the highest level reached $68CB),
$6918 the 25 row colours, $6931 the eight level keys, $6939 seven sprite
colours, $6A08 seven `JMP $6A1D` stubs and the `RTS`, and rows 20-21 the
three skill names in the wide font that F5 copies to row 22.

**Sprites.** 64-byte frames at $6400 (shot dot), $6700 (gun sight),
$6740 (ground strip), $6780 (mound) and $7000-$77FF (32 frames: saucers
$CA-$CE at three sizes, dome $B0, dot fields $B1-$C9, oval $E6, dotted
hills $EC-$EF which overlap the font at $7B00, and twelve dense noise
frames $D0-$DB and a sphere $CF that nothing points at). Sprite
pointers are at $63F8 and $67F8.

**Zero page.** $8B00-$8B9F is the image copied to $03-$A1 at init
($9C43) and at every game start ($9E82); $02 is never initialised.
Named variables: $05 next dynamic character; $08 frame parity; $0F view
count; $12 object screen X in pixel pairs; $1B frame counter, $58 its
256-frame wraps; $1D voice-1 countdown; $23-$25 turn steps and rate;
$2D object ahead; $31 range to the enemy; $33 missiles pending; $3B
difficulty (ramps to $3F); $43 collision threshold; $4D spawn countdown;
$5C fire lock; $62 skill; $63 scene index, $66 last applied; $68 player
speed; $69 gate/warp phase; $6D/$6E joystick nibble and fire; $6F-$73
demo replay state; $70 random seed; $71 demo flag; $7A saucer type; $7B
fire-script offset; $83 gate entered; $A3/$A4 state vector; $A5 warp
progress; $A8 selected level; $AB-$BA current scene record; $BB-$BE
resolved band colours; $F7/$F8 shape script pointer.

## Sound

SID voices are driven directly, no music player. Voice 1: engine hum
($A231 picks a loop from $80C0 into $93; the interrupt steps it through
$80C8 every frame at $B415), the bump noise ($B549, noise waveform at
$1414) and the shot and death bursts. Voice 3: the saucer hum, pitched
from range $31 ($A5F2), and an eight-step warble stepped from $80A0 by
$B444. Voices 2 and 3 together: the homing-missile whine, rising with
approach ($A811). The warp has its own tone ramp ($A4CD, $75/$76).
Volume is $0F with the filter set at $9D9B; $D417 is written once at
$A040. The title screen plays a single tone on voice 1 ($9CEA) while a
selection key is held.

## Oddities to settle

- **Seven executed junk bytes.** $9FF9-$9FFF hold `A9 4B 53 54 41 3A 2A`
  between the start-of-game setup and the level-start code at $A000. A
  non-stopping checkpoint on $9FF9 and on $A000 each counted one hit on
  the F7 press, so the CPU runs through them: `LDA #$4B`, then the
  undocumented `SRE ($54),Y`, `EOR ($3A,X)`, `ROL A`. As ASCII the bytes
  read `KSTA:*`. Whether this is a crack patch or original is unknown.
- **A raster wait through $CFF9,X.** $9DEC reads `$CFF9,X` with X = $19,
  which is `$D012`, the raster line, while $C000-$CFFF itself is
  uninitialised RAM. The loop spins until the raster low byte reads zero,
  then branches on the previous non-zero value: $F0 or more loops again,
  $30 to $EF continues to $9E02, below $30 jumps through ($F7), which by
  then points at $DBE8 in colour RAM. On PAL the value before a zero is
  $FF (line 255 to 256) or $37 (line 311 to 0); on NTSC it would be $06.
  Tested live with the emulator set to NTSC: the title screen is drawn,
  $9DFF executes once, and the CPU parks at $DBE8 for good (six program
  counter samples over three seconds all read $DBE8). On PAL, $9DFF never
  runs and $9E02 runs once. The game is PAL-only by construction; an NTSC
  machine shows the title and hangs (reference/ntsc-hang-title.png).
- **Calls into the title screen.** `JSR $6A0B`, `$6A0E`, `$6A11`, `$6A17`
  land in row 13 of the title screen data, which holds `JMP $6A1D`
  repeated seven times followed by `RTS` at $6A1D. Every one of these
  calls is therefore a no-op. Whether that row once held code (a tape
  loader hook, a protection check) is unknown.

## Live tests

- 2026-09-20, fresh autostart: checkpoints (non-stopping) at $0960 and
  $9C00 hit once each before the title screen: the boot chain in
  orientation.md.
- 2026-09-20, title then F7: $6A0B hit once, $9C5C never, $B2FE (first
  raster stage) 5 times at the title and 309 in the first six seconds of
  play (one chain per frame); $9FF9 and $A000 once each at game start;
  $AD38 not in the first six seconds.
- 2026-09-20, attract demo with hit counters on the mechanic routines
  and the raster stage as control: over about four minutes, 13 saucer
  spawns ($A42C), 2 missile spawns ($A3A5), 10 kills ($A8B2), 113 shots
  ($ACB6), 42 bumps ($B53F), 70205 obelisk tests ($AC30), 483 frames of
  the warp-in flash rectangle ($BA04), 6 deaths ($AB9A), one game over
  ($ABED then $9C5C), 10672 raster frames. After poking the enemy count
  $8BA8 to 1, the next kill opened the gate once ($A2A1), the gate state
  ran 133 frames ($A4EC), the shield digit went up once ($A91D), and the
  warp ran 351 frames ($A713) before the demo's scripted stick flew into
  a sphere; $A798 never ran, so level completion stayed traced. The game
  over came on the sixth death: four shields plus the one awarded, and
  the death that finds the digit already at 0 ends the game ($ABD8).
- 2026-09-20, fresh boot: key 5 on the title then F7 gave $A8 = $30 and
  a status row reading L5 (reference/play-level5-selected.png): any level
  is selectable without having reached it.
- 2026-09-20: SPACE sent through the emulator's key-press tool (the
  matrix tool's SPACE never reached the game) put the CPU in the pause
  loop ($A13B counted 250,000 iterations); a second SPACE left it there;
  holding the stick right ($6D = 7) ended it and play resumed. F1 held
  for two seconds during play returned to the title loop.
- 2026-09-20: holding the stick right for several seconds via
  `vice_joystick_set` port 1 (which drives $DC00) turns the view; a
  screenshot showed a saucer beside a pillar and the enemy counter
  dropped from E15 to E14 after fire was pressed, so a hit scored.

