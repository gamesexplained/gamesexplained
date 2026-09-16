# Choplifter — verified technical facts

Current truth for this game. Method lives in `skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The program on the disk is a **16 KB cartridge image** with a small loader
in front of it. `$8000`/`$8001` and `$8002`/`$8003` are the cartridge cold
and warm start vectors, both `$9593`, and `$8004`-`$8008` holds
`$C3 $C2 $CD $38 $30`, the `CBM80` signature a C64 looks for at `$8000`
during reset. `$9593` does what the KERNAL's reset would have done after a
cartridge takes over: `jsr $FF84` (IOINIT), `jsr $FF87` (RAMTAS),
`jsr $E518` (CINT), and then falls into `$959C`. It skips RESTOR, because
the game installs its own `$0314` and `$0318`. The disk loader jumps
straight to `$959C`, nine bytes later, because the KERNAL has already
booted.

The only build text is on the title screen: `BRODERBUND SOFTWARE PRESENTS`
at `$9B0D`, `CHOPLIFTER!` at `$9B2A`, `DAN GORLIN` at `$9B36`, `DANE
BIGHAM` at `$9B41`, `(C) 1982` at `$9B4D`. No version number, no build
date, no cracking group.

`$8000`-`$BFFF` in a running game is byte for byte identical to the copy on
the disk (*live*). Nothing in the program modifies itself.

## Memory layout

| Thing | Where |
|---|---|
| Zero page variables | `$0000`-`$00FF` |
| Video matrix, VIC bank 0 | `$0400`-`$07E7` |
| Disk loader, dead after the copy | `$0801`-`$0873` |
| Bitmap row addresses, low bytes | `$0A00`-`$0AA7` |
| Bitmap row addresses, high bytes | `$0AA8`-`$0B4F` |
| Game state, actor records, people, dirty-rectangle lists | `$0B50`-`$0DFF` |
| Pre-shift tables for the blitter | `$1000`-`$1FFF` |
| Bitmap, VIC bank 0 | `$2000`-`$3F3F` |
| Video matrix, VIC bank 1 | `$4400`-`$47E7` |
| Character set copy | `$5000`-`$57FF` |
| Bitmap, VIC bank 1 | `$6000`-`$7F3F` |
| Cartridge header | `$8000`-`$8008` |
| Shape pointer table, 75 entries | `$8009`-`$809E` |
| Shape bitmaps | `$80A1`-`$8A8A` |
| Code, tables and text | `$8A8B`-`$BFFE` |

`$01` is `$36` during play: the BASIC ROM is switched out so the top 8 KB of
the cartridge has RAM under it, I/O is visible, and the KERNAL is still in.
The game calls the KERNAL keyboard scan at `$FF9F` from its own interrupt
handler (`$9A63`), which is what makes the RUN/STOP pause work.

## Graphics

**No hardware sprites.** The game never writes `$D015` and it reads `0`
during play (*live*). Everything that moves is drawn into a bitmap by
software.

**Multicolour bitmap, double buffered.** There are two complete displays,
one per VIC bank:

| | VIC bank 0 | VIC bank 1 |
|---|---|---|
| video matrix | `$0400` | `$4400` |
| character set for the top bar | character ROM, seen at `$1000` | RAM copy at `$5000` |
| bitmap | `$2000` | `$6000` |

`$8D16` flips bit 6 of `$0F`; `$8D1F` writes the matching VIC bank into
`$DD00` after forcing the two low bits of `$DD02` to outputs. `$0F` is
**exclusive-ored** into the high byte of every bitmap row address (`$8D57`,
`$8C97`, `$8EC0`, `$917F`), which is what makes one set of tables serve
both buffers: the two bitmaps are `$4000` apart and bit 6 is the whole
difference.

Colour RAM is a single hardware resource, so the `11` bit pair is the same
in both buffers; only the video matrix and the bitmap are doubled.

**The play area uses four colours and never changes them.** The video
matrix holds `$2E` in character rows 4 to 19 and `$26` in rows 20 to 24,
and colour RAM holds `1` in all 840 cells of the play area. So bit pair
`01` is red, `10` is light blue in the sky rows and blue in the ground
rows, `11` is white, and `00` is whatever `$D021` holds at that raster
line.

**The character set copy at `$5000` is byte for byte the first 2 KB of the
C64 character ROM** (*live*: read through the emulator's `rom` bank and
compared, 0 bytes differ). `$BFA8`-`$BFD8` makes it during cold start: it
stops CIA1 timer A, writes `$32` to `$01` to expose the character ROM at
`$D000`, copies eight pages, restores `$01` and restarts the timer. The VIC
can see the character ROM at `$1000` in bank 0 but not in bank 1, so the
game keeps its own copy for the bank-1 half of the flip.

**Row address tables.** `$0A00,x` and `$0AA8,x` give the address of pixel
row *x* of the play area, 168 entries, built by `$BF2F`-`$BF61`. They run
**downwards**, and for every one of the 168 entries (*live*, checked
against the snapshot):

```
$0A00/$0AA8[y] = $2000 + 320 * (24 - (y >> 3)) + (7 - (y and 7))
```

Entry 0 is `$3E07`, the last pixel line of character row 24; entry 167 is
`$2500`, the first line of character row 4. The play window is character
rows 4 to 24, 21 rows, 168 pixel lines, and the game's vertical coordinate
counts **upwards from the ground**. Screen line = 199 − y.

**The pixel-to-address rule.** For a pixel row *y* and a 16-bit screen bit
column X in `$04`/`$05`:

```
low  byte = $0A00[y] + ($04 and $F8)
high byte = ($0AA8[y] eor $0F) + $05 + carry
bit in byte = 7 - (X and 7)
```

`(X and $FFF8)` is `8 * (X >> 3)`, so the cell offset needs no multiply.

**Pre-shift tables.** `$1000`-`$1FFF` is 4 KB of lookup, built by
`$BF63`-`$BF98` (*live*: all 4096 bytes checked against the formula).
`$1000 + 256n + y` is `y >> n` and `$1800 + 256n + y` is
`(y << (8-n)) and $FF`. `$8DF3` points `$42/$43` at the first and `$44/$45`
at the second, and `$8FD3` blits a whole row a byte at a time through them
plus a one-byte overflow register in `$41`, so nothing is shifted at run
time. The tables sit at `$1000` because in VIC bank 0 the VIC sees the
character ROM there and never sees that RAM.

**Shape format.** `$8009`-`$809E` is 75 interleaved lo/hi pointers into
`$80A1`-`$8A8A`. A shape is one byte of width **in bitmap bits**, one byte
of height in rows, then `ceil(width/8)` bytes per row, top row first.
Thirty of the seventy-five have an odd bit width and the shapes are not
pixel-pair aligned, so the same bytes give different multicolour codes at
an odd and an even bit offset. `$903E` is a mirrored blitter that reverses
each row bit by bit with `asl a` / `ror $19`; because the reversal is
bit-exact it also swaps the two bits inside each pixel pair.

Only shape entry 0 is indexed as a table proper. Every other reader takes a
fixed base address inside the table, or reaches an entry as an inline
pointer through `jsr $8BE0`.

**Erasing.** Nothing is cleared. Every object that is drawn files a
four-byte record (size class, screen X low, screen X high, row) in a list
through `$AA38`. The two lists are at `$0D03` and `$0DA3`, 40 records each,
one per buffer, set up by `$A9E1`. `$BBE6` swaps them and replays the one
belonging to the buffer about to be drawn, painting those rectangles out.
The sizes are 26 (columns, rows) pairs at `$94AF`, read only by `$BC1D`.

**The starfield** is 24 fixed bitmap addresses in the interleaved table at
`$924E`. `$9228` runs once a frame and writes `$03` or `$01` to each,
chosen by `$DC04 and 3`, exclusive-oring `$0F` into the high byte for the
buffer. Each write also blanks the other three pixel pairs in that byte, so
a star erases itself.

## The screen, band by band

The raster handler at `$99F2`, reached through `$0314`, compares `$D012`
with six values:

| Raster | Routine | What it does |
|---|---|---|
| `$1E` | `$9A13` | character mode, multicolour off, character base VIC bank + `$1000`, border and background black. Also calls `$FF9F`, the KERNAL keyboard scan |
| `$51` | `$9A69` | bitmap on, multicolour on, bitmap base VIC bank + `$2000` |
| `$81` | `$99A8` | back to character mode, for the middle text window |
| `$91` or `$A9` | `$99D0` | bitmap on again, at the bottom of that window |
| `$E0` | `$9A94` | border **and** background to colour `$0C` |

During ordinary play only `$1E`, `$51` and `$E0` fire (*live*: 102 frames
gave 102 hits each on those three and zero on `$99A8` and `$99D0`).
`$9A85` tests `$02 + $93` and only then chains to `$81`. `$02` is set by
`$8A8B` when a caption is up and `$93` by `$9AAC` for the title block: two
character rows for a caption, five for the title.

The ground is the `$E0` band. The bitmap below display line 173 is almost
entirely zero, so what fills the bottom of the screen is `$D021`.

## Timing

A raster interrupt, enabled at `$A79E`. **The main loop is not locked to
it**: `$966F` ran 83 times in 201 raster frames, about 21 passes a second
against 51 (*live*). Counters stepped by the interrupt are `$96` (fire
button hold), `$95`/`$94` (rotor beat) and `$98` (effect length).
Counters stepped once per pass are `$89` (the frame counter the flag and
the tail rotor animate from), `$63` and the message timeouts.

The NMI vector `$0318` points at `$9AAB`, which is the `rti` that ends the
IRQ handler. RESTORE therefore returns immediately (*live*: six RESTORE
presses hit `$FE43` six times and the game did not miss a pass).

## Controls

The joystick is read at `$DC01`, control port 1, from `$976A`, `$9774`,
`$97AD`, `$9816`, `$A71A` and `$A741` (*live*: driving `$DC01` flies the
helicopter). Bits are the standard ones, active low: 0 up, 1 down, 2 left,
3 right, 4 fire.

The fire button has one threshold, not three. The raster interrupt counts
frames into `$96` while it is held. On release `$9774` compares with 15:
under 15 it calls `$97D2` and a shot is requested; 15 or more it calls
`$97F1` and the machine turns. The direction is latched once, on the frame
the count crosses 15 (`$0B54`), and the stick is only consulted when `$59`
is 0 or ±1. At a full facing the stick is ignored and the hold flips the
machine to face the other way. Nothing happens while landed, `$5D = 0`
(*live*).

RUN/STOP pauses, at `$98BC`, by reading the KERNAL scan code in `$C5`
(`$3F`), writing `$D418 = 0` and busy-waiting for release, the next press
and its release (*live*).

## Mechanics

**The world.** One world, the same for every sortie. The four sheds stand
at world X `$037D`, `$047D`, `$057D` and `$067D` as immediate operands in
`$B8AE`; the base is at `$1254` in `$BA3F`; the camera is clamped between
`$02B0` and `$11D8` in `$BD9C`, so the visible world is 4,888 bitmap bits,
about fifteen screens. World X is in bitmap bits, two per multicolour
pixel, and the window is 320 bits wide.

**The camera** (`$BCA2`, `$75`/`$76`) has three modes: pan right at 4 a
frame while `$5F` is set; lead the helicopter when its facing `$59` agrees
with the sign of its velocity `$52`, aiming at position plus velocity/32
and closing at 4 + |velocity|/256 a frame; otherwise snap so the
helicopter stays 70 to 250 units right of the camera.

**Hostages.** 64 in total. `$BE52` starts a sortie with 16 in each of
sheds 1 to 3 and 8 in shed 4, which begins already open, its other 8
walking about outside. The only number that varies between sorties is the
gap between those 8: `$20` plus a CIA1 timer sample masked with `$7E`, an
even gap between 32 and 158. `$0CA0` holds sixteen four-byte records (walk
phase, direction, 16-bit world X), walked and drawn by `$9B7D`.

With the helicopter on the ground and motionless (`$5E`), a hostage at
signed distance −9 to +7 is **killed**; at +8/+9 or −11/−10 he is at the
door and climbs in, unless `$0CF1` already holds 16.

**The flight model** is two models switched by `$5D`. `$A615` in the air:
bank steps towards the stick, X and altitude are integrated, the world is
clamped to `$02D0`-`$12D0` and the ceiling is `$70`. `$A4DA` on the
ground: bounce at `$A5BE`, a ground spring at `$A5E1` with the constant
`$04B0`, skid friction, and bank derived from the residual velocity.
`$A7D6` picks between them by comparing `$57` with the per-bank ground
clearance in `$9471`, and `$A8B8` corrects world X and altitude from the
anchor tables at `$945B` and `$9471` when the bank frame changes, so the
picture does not jump.

**The depth axis.** Every actor carries a height (`$0B7A`, field +6) and a
base row (`$0B7B`, field +7) which `$A9A0` adds together to get the bitmap
row. The base row stands in for depth. The player's plane is `$58` = 22;
tanks sit on base rows 5 to 12, one each. `$B344` will only test a
collision when the actor's base row still equals `$58`.

**The tank** (`$A0BB`, type 3) draws three pieces filed separately in the
frame's object list, so hull, turret and barrel can be hit on their own.
`$0B77` is an aim index 0 to 4; `$A249` gives the bearing window each index
covers and `$A244` the barrel's X offset (`+11, +7, +1, -1, -5`). The tank
steps one notch per fire-timer expiry towards the window the helicopter is
in and fires only on a tick when it is already pointing there.

**The jet** (`$AD8F`, type 9) does not steer. Five states, four of which
are lists of four-byte records read one per frame (shape, X step, height
delta, base-row delta). Counts at `$AD8A` are 0, 18, 15, 10, 10 and the
pointers at `$AFC2` are `$94E3`, `$94E7`, `$952F`, `$956B`, `$956B`. State
0 is the cruise, one shape held. On its firing frame it spawns a pair of
type-4 rockets when the player is airborne and a single type-5 shell when
the player is landed.

**What can kill the helicopter in the air** is only the jet's rocket
(`$B433`) and the type-10 mine (`$B474`). Everything else can only become a
ground explosion, and `$B4C3` lets a ground explosion hurt the helicopter
only while `$5D = 0`.

**Progression** is `$8D`, 0 to 3, raised at `$9EBA` the first time the
player unloads after a pickup, so it tracks how well the player is doing
rather than how long the game has run. `$A363` is the spawn clock: every
4th tick releases hostages, and 8 ticks in every 256 (`$89 and $2F == 0`)
spawn a vehicle. Caps: `$A3B2` allows 1, 2, 1, 1 live tanks and `$A3B6`
allows 0, 1, 2, 2 jets. At `$8D = 0` only tanks appear. Tanks are refused
while the helicopter is within two pages of the right-hand end.

`$0CF3` counts the player's shots currently in flight; `$97DE` refuses to
fire once it reaches 5.

**The status bar** is three two-digit BCD counters written by `$A978` at
`$0459`/`$045A`, `$0464`/`$0465` and `$046F`/`$0470`: spade `$0CFC`
killed, diamond `$0CFE` aboard, heart `$0CFD` rescued.

## Actor model

`$B307` walks a doubly linked list once a frame and dispatches each actor
through the table at `$B32E`. It pushes `$B328` first, so every handler
ends with `rts`. Records are 10 bytes at `$0B74 + 10n`; record 0 is a dummy
head whose fields double as the head (`$0B7D`) and tail (`$0B7C`) pointers.
`$74` heads the free list.

| Field | Meaning |
|---|---|
| +0 `$0B74` | type, 0 to 10 |
| +1 `$0B75` | signed horizontal velocity, or state |
| +2 `$0B76` | vertical velocity |
| +3 `$0B77` | per-frame base-row step, or facing/aim index |
| +4/+5 `$0B78`/`$0B79` | 16-bit world X |
| +6 `$0B7A` | height above the base row, counting up from the bottom |
| +7 `$0B7B` | base row, the pseudo-depth plane |
| +8 `$0B7C` | back link |
| +9 `$0B7D` | forward link |

| Type | Handler | What it is |
|---|---|---|
| 0 | `$AFD6` | the player's helicopter |
| 1 | `$B106` | explosion in the air |
| 2 | `$B106` | explosion on the ground |
| 3 | `$A0BB` | tank |
| 4 | `$B221` | the jet's rocket, fired in pairs |
| 5 | `$B1E8` | the jet's lobbed shell; no collision test at all |
| 6 | `$B16E` | the helicopter's shot |
| 7 | — | never assigned; the table entry is `$0000` |
| 8 | `$B26D` | arcing shell, from a tank or a mine |
| 9 | `$AD8F` | jet |
| 10 | `$B73D` | a mine that homes on the helicopter |

Type-9 slots are listed at `$0CE4` with count `$0CE3`; tanks at `$0CE9`
with count `$0CE8`; type 10 is a singleton at `$0CE1`/`$0CE2`.

## Shapes

75 entries. Attributed, by index:

| Index | What |
|---|---|
| 0-10 | the helicopter's eleven bank frames, 5 level, drawn mirrored for the other facing |
| 11-13 | head-on and the two turning frames, sheared rather than pre-drawn |
| 14, 15 | the same drawing one row shorter with the undercarriage redrawn, used only on the frame the skids bite (`$60` set): 14 side-on, 15 head-on |
| 16-18 | the main rotor disc, stepped `$0B61` 4, 2, 0 |
| 19-22 | the tail-rotor blur, stepped `$0B62` 6, 4, 2, 0, drawn only at a full side facing |
| 23 | the jet cruising |
| 24-38 | the jet's manoeuvre frames |
| 39, 40 | tank turret, tank hull and tracks |
| 41-45 | the tank's gun barrel at five elevations |
| 46-49 | projectiles for actor types 6, 8, 4 and 5 |
| 50 | the homing mine |
| 51-54 | the four-frame explosion |
| 55-58 | a person walking |
| 59-61 | a person waving, played 59, 60, 61, 60 |
| 62, 63 | a person climbing into the helicopter |
| 64 | the hill, drawn three times by `$AA80` at row 29 |
| 65 | half of the base bunker, drawn plain and mirrored |
| 66 | the base's sloping end cap |
| 67 | the flagpole |
| 68, 69 | the flag, alternating on bit 0 of `$89` |
| 70 | the parallax blob, drawn four times by `$B971`. What it depicts is unknown |
| 71, 72 | the shed, shut and blown open |
| 73 | the bar of ground a shed stands on |
| 74 | the figures in an open shed's doorway |

`$809F`-`$80A0` is two zero bytes, referenced by nothing and not a valid
shape.

## Sound

Full volume, no filter: `$A75C` writes `$0F` to `$D418`.

**Both engine voices are noise.** `$9975` writes `$81` to `$D404` (bit 7
selects the noise waveform, bit 0 opens the gate) and `$9A55` does the same
for voice 2 at `$D40B`. Voice 1 is the rumble: frequency high byte `$01`,
low byte the sliding `$0B5E` that `$996B` walks up towards `$C0` in steps
of `$10` while the machine is airborne and back down towards `$30` on the
ground. On PAL that is 17.9 Hz to 26.3 Hz of noise clock. Voice 2 is the
chop: frequency `$041A`, envelope A4 D2 S1 R0, re-gated every `$94` raster
frames, and `$94` shortens from `$11` to 8 as the rumble rises. Voice 3 is
left for `$A7C7`'s effects and is gated `$11`, a triangle.

## The inline-parameter convention

Five routines take their argument from the two bytes that follow the `jsr`
that calls them:

| Routine | Inline bytes | Effect |
|---|---|---|
| `$8BBA` | a 16-bit value | `$37`/`$38` = the two inline bytes |
| `$8BE0` | a pointer | `$37`/`$38` = the word at that pointer |
| `$8BF9` | a pointer | `$34`/`$35`/`$36` = three bytes at that pointer |
| `$8C17` | a pointer | `$3B`/`$3C` = the word at that pointer |
| `$8B91` | a pointer | `$04`/`$05`/`$03` = three bytes at that pointer |

All five go through `$8B1E` or `$8B38`, which pull the caller's return
address off the stack, read the inline word through it and resume two bytes
later. There are 58 call sites. `$8B68` is a sixth wrapper of the same
shape and is dead code: no `20 68 8B` or `4C 68 8B` appears anywhere in
`$8000`-`$BFFF`.

## Dead code

| Range | What |
|---|---|
| `$8B68`-`$8B90` | a sixth inline-parameter wrapper, never called |
| `$ACDD`-`$ACF0` | an 8-by-8 multiply, `$7D * $7E` into `$7F`/`$80`, no cross-references |
| `$BE1D`-`$BE51` | a signed 16-bit shift left, the mirror of `$ACF1`, no cross-references |

## Bugs and slips

- **The actor free list is built four links too long.** `$AA11` sets the
  head to offset 20 and then runs its link loop with `ldy #$1E` followed by
  three `dey`s, which gives 27 iterations rather than the 23 the 26-record
  array needs. The first 24 links are the proper chain, offsets 20 to 250.
  The 25th store wraps the 8-bit index and writes 4 into the last record's
  link, and the next three stores land at `$0B81`, `$0B8B` and `$0B95`, the
  `+3` fields of slots 1, 2 and 3, with the terminator at `$0B9F`. The free
  chain therefore has 24 usable records and would hand out offset 4, which
  straddles slots 0 and 1, if more than 24 actors were ever alive at once.
- **`$9F54`, the right-hand tank spawn, never produces a usable tank.**
  `$9F3D` subtracts `$01B0` from `$55`/`$56` as a 16-bit quantity into the
  actor's world X. `$9F54` adds `$B0` to the low byte with no carry and
  then stores `$00` into `$0B79`, the high byte, so the tank's world X is
  `$00xx`, off the left-hand end of a world that begins at `$02B0`, and
  `$A16B` deletes it on its first update. Roughly half of tank spawns take
  that branch.
- **A shot fired anywhere but fully side-on can never hit anything.**
  `$AD24` gives a new shot a per-frame base-row step from `$AD86`
  (`-2, -2, -1, 0`, indexed by `|$59|`). `$B344` refuses any actor whose
  base row is not `$58`, so only a shot fired at a full side facing keeps
  its row and stays collidable.
- `$B652` admits shed indices 0 to 2 while the identical box test at
  `$B369` admits 0 to 3, so an explosion over the fourth shed could never
  open it. `$BE63` writes 1 into `$0CF7` before play, so it is always
  already open and the difference never shows.
- `$B50E` and `$B19F` each begin a 16-bit subtraction with no `sec`, so
  those two horizontal comparisons are one unit short.
- `$BF19`'s clear loop stores to page `$0E` three times over and never
  clears page `$0F`.
- `$98DF` assembles `sta $471F,y` twice in a row, and its companion
  `sta $071F,y` runs 31 bytes past the end of the screen into `$081E`.
  Neither is visible: those rows are always under the bitmap.

## Live tests

| Test | Result |
|---|---|
| `$D015` read during play | `0`; no sprite is ever enabled |
| `$5000`-`$57FF` against the character ROM read through the emulator's `rom` bank | identical, 0 bytes differ |
| `$1000`-`$1FFF` against `y >> n` and `(y << (8-n)) and $FF` | identical for all 4096 bytes |
| `$0A00`/`$0AA8` against the row formula | holds for all 168 entries |
| Writing `$1F` to `$DC03` and then `$DC01` | flies the helicopter; the game reads control port 1 and nothing else |
| `$8000`-`$BFFF` in the snapshot against the bytes extracted from the `.d64` | identical, 0 bytes differ |
| Checkpoints on `$9A13`, `$9A69`, `$9A94`, `$99A8`, `$99D0` over 102 frames | 102, 102, 102, 0, 0 |
| Checkpoint on `$966F` over 201 raster frames | 83 passes |
| Six RESTORE presses | `$FE43` hit six times, no pass missed |
| Forcing RUN/STOP | `$89` froze and `$D418` dropped to 0; a second press restored both |
| Firing with `$59 = 0` | the new type-6 actor had `$0B77 = $FE` and its base row fell `$12, $10, $0C, $0A, $06, $04` |
| Checkpoint on `$9B56` over 118 ticks of play | 0 hits; it runs once as the attract loop exits |
