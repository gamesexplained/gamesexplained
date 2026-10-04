# Mr. Hat — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/handover.vsf` (`orientation.md`). *Live*
means observed in VICE (vice-mcp v3.13.1, PAL), with the script named.
Times assume PAL, 50.12 frames a second.

## Build

No version or build string was found. The image is the game as *Commodore
64 Club* issue 14 shipped it on side B of its disk (`orientation.md`): a
freezer backup of the game on its title screen, loaded by a fast loader.
The tape image `mrhat.t64`, which the contributor took from the GameBase
collection, holds the same file byte for byte. The
game's own BASIC line survives at `$0801`: `10 SYS 2157` and the text
`SYSTEM EDITOR<<<E **` (`$0810`). Chiola's earlier game Lupenio (SIPE,
1988) left text and dead code in the image ("Leftovers", below), and a
copy of the Supermon machine-code monitor sits at `$97ED`-`$9FFF`.

## Versions

Three copies were compared, each started in VICE and stopped at the
game's first instruction (`work/versions/bootcmp.py`), memory read whole.

- **The disk** (`work/original.d64`, issue 14) and **the tape image**
  (`mrhat.t64`, the contributor's copy from the GameBase collection): the same file, and the same RAM, all 65,536 bytes, at
  `$1773`.
- **A fixed version by botowrap** (`work/boto.prg`, 20,548 bytes with
  its load address, `$0801`-`$5842`, `SYS 2061`): a packed file that unpacks the game and
  enters it cold at `$086D`, the game's own entry, instead of resuming a
  frozen title. Against the disk's game restarted at `$086D` the same way
  and stopped at `$1773` (`work/versions/d64-restart.vsf`), the game's
  memory differs in these places only, and no instruction differs:
  - the title font, `$CE48`-`$CE55`: 14 bytes put back ("The title font
    is damaged in the image", below), and so its copy at `$2848`-`$2855`,
    which the restart has just made;
  - the ladder, `gfx_ladder_row` `$4802`-`$4809` and `$4812`-`$4819`: its
    left and right cells redrawn, the rung cell `$480A`-`$4811` left as it
    was ("The ladder", below).

  The rest is start-up: zero page, the stack page and the KERNAL's
  variables and vectors (`$0287`, `$028C`, `$02AF`, `$0304`-`$030B`;
  `$2D`-`$32` point at `$5843`, the end of botowrap's file), RAM the game
  never uses under I/O and the KERNAL, and tables at `$0334`-`$03CB` that are already there before
  the game starts, so belong to the unpacker; no instruction in the game
  refers to `$0334`-`$03CB`.

## Memory layout

| Thing | Where |
|---|---|
| Entry (`SYS 2157`) | `$086D`: `JSR $0876` (sets `$01` = `$36`, `JSR $16A3`, the title), `JSR $9265` (bitmap mode on), `JMP $087E` (clears `$D40F`, `$F7`-`$FA`, `$64F0`, `$64F1`, sets `$44E0` = `$20`, then `JMP $6E00`, the start of play) |
| Title | `$16A3`: KERNAL IRQ back to `$EA31`, clears `$2000`-`$3EFF`, `JSR $CDC0`, sprite colours, `JSR $1770` (the fire wait). `$16A0` is `JSR $A500` and falls into it |
| Title set-up | `$CDC0`: starts the music (`$C09B`), copies the font `$CE00`-`$CFFF` to `$2800`, text mode, `$D018` = `$1B`; then `$B683` draws the cast, or, when `$1018` is set, `$BFA8` the end message |
| Title words | screen codes at `$C000`-`$C058` ("Text") |
| Play screen | bitmap at `$2000`-`$3F3F`, colours at `$0400`, hires (`$D011` = `$3B`, `$D016` = `$C8`, never written anywhere in the image) |
| Status line | bitmap rows 23-24: SCORE digits in columns 13-18, ROOM in 24-25, STAGE in 31, each digit two cells high, drawn from the glyphs at `$1600` (16 bytes a digit, top cell first) |
| Mr Hat | hardware sprite 4: his position is the sprite's own registers `$D008`/`$D009`, stepped with `INC`/`DEC` in place; no other copy of it is kept *live* (`work/track.py`) |
| Lives marks | colour cells `$07B9`, `$07BA`, `$07E1`, `$07E2` (`$BC` shown); a death recolours one to `$CC`, grey on grey (by the code, a death in room 3 recolours two; see "Lives") *live* (`$07B9` `$BC` → `$CC` after one death, `work/death1.vsf`) |
| Interrupts | title: `$0314` = `$C0AF` (music); play: each room but room 10 installs its own handler (room 1 `$1C00`, which jumps to `$AAB2`), and all end through `$8215` → `$BF30` → `$B530` → `$8C00` → `$7C70`. `$01` = `$36` throughout |
| Room code | ten blocks for eleven rooms (4 and 7 share one): set-up, interrupt handler (none for room 10), main loop, floor rules (table below) |
| Shared engine | walking `$5340`/`$5370`, ladder step `$4B20`, collision test `$55B0`, death `$A877`, score `$41DA`, graphics library `$A400`-`$A6FF`, object drawers among other shared code at `$A702`-`$ABEF`, tiles `$AC00`-`$AFFF` |
| Music | player `$C080`-`$C373` (with the vector hooks `$CB07`, `$CB14`), data `$C374`-`$CDBF` |
| Leftovers | Lupenio's text `$7E28`-`$7FE9` and `$A1F6`-`$A35A`, a dead ending `$7CF6`-`$7E27`, an F1 wait `$8000`; Supermon `$97ED`-`$9FFF` |

## The rooms

`$100C` holds the room number, stored by each room's set-up (in BCD: room 10
is `$10`, room 11 `$11`). `$4ACD` is the entry code: the room Mr Hat leaves
writes it, and the next room's set-up reads it to place him. The table at
`$A817`-`$A85E` holds ten trampolines, rooms 4 and 7 sharing one, each `JSR $A84E`
(screen back on) then `JMP` to a main loop.

| Room | Stage | `$100C` | Set-up | IRQ | Main loop |
|---|---|---|---|---|---|
| 1 | 1 | 0 | `$6E00` (via `$17DF`), stores at `$6F21` | `$1C00` | `$42EF` |
| 2 | 2 | 2 | `$4D80`, stores at `$4EAF` | `$510A` | `$51F4` |
| 3 | 2 | 3 | `$4642`, stores at `$478E` | `$48B0` | `$4910` |
| 4 | 2 | 4 | `$9000` with `$4ACD` = `$10` or `$28` (it also tests `$07`, which nothing writes) | `$B9AD` | `$9320` |
| 5 | 2 | 5 | `$573D` | `$596A` | `$5A60` |
| 6 | 3 | 6 | `$5E10` | `$608A` | `$6220` |
| 7 | 3 | 7 | `$9000` with `$4ACD` = `$40` or `$48` (`$95A0`) | `$B9AD` | `$9320` |
| 8 | 3 | 8 | `$65E0` | `$683D` | `$6A20` |
| 9 | 3 | 9 | `$7140` | `$7600` | `$76B0` |
| 10 | 4 | `$10` | `$8300` | none | `$8410` |
| 11 | 4 | `$11` | `$8480` | `$8660` | `$86B0` |

*Live*: each set-up, started from play (`work/goroom.py <set-up> <entry
code>`), draws its room with its ROOM digit, and every set-up but the one
rooms 4 and 7 share draws the STAGE digit too; those two keep the digit of
the room before (2 and 3 in play; started from room 1, the references show
STAGE 1) (`reference/room02-setup.png` to `room11-setup.png`).

The main loops are copies of one template. Rooms 6 and 8's loops
(`$6220`-`$6335`, `$6A20`-`$6B35`) are 278 bytes each and differ in 54, all
but one of them call, jump and branch operands, the last a `JSR` at `$6333`
where room 8 has a `JMP` at `$6B33` (checked byte for byte). Room 9's loop
matches room 11's instruction for instruction; rooms 2 and 6 match it but
for the last jump, and rooms 5 and 8 differ in their last two or three
instructions. Rooms 1, 3 and 4/7 differ more, and room 10's loop is a
ladder loop of its own. What each room
adds is its own floor rules, hazards, guardians and objects.

Exits, from the room code: room 1 to room 3 (`$44C0` → `$4722`); room 2
right to 3 (`$4642`); room 3 to room 2 with entry code `$08` and to room 4
with `$10` (`$4C34`, dispatched at `$483A`), and room 4 back to room 3
(`$94FB`-`$9500`, `JMP $4642`); room 2 down its ladder to 6 (`$5E10`);
room 4 right to 5 (`$954B`); room 5 left to 4 and down its ladder to 9;
room 7 left to 6 (`$9510`) and right to 8 (`$955B`); room 6's ladder up to 2, bottom right to 7;
room 8 to 7, to 9 and down its shaft to 10; room 9 left to 8, up to 5,
down to 11; room 10 up its ladder to 8; room 11 up its ladder to 9.

## Controls

- Joystick in control port 2. Every test is an exact value of `$DC00`, so
  a diagonal does nothing.

  | `$DC00` | Action |
  |---|---|
  | `$6F` (fire alone) | jump, the way Mr Hat faces (`$438D` room 1, `$5227`, `$76E3`, `$86E3` and the other loops) |
  | `$67` / `$6B` (fire with right / left) | jump, the way he faces, from standing or straight after a jump (`$444F` room 1, `$4A69` room 3, `$52F0` room 2) *live*: fire with right from standing jumped at once (`work/track.py death1`) |
  | `$77` / `$7B` | walk right / left |
  | `$7D` (down) | crouch (frame `$2A`), climb down, and take a treasure |
  | `$7E` (up) | climb a ladder or ride a lift up; nothing on a floor |

  *Live*: from standing in room 1 (`work/death1.vsf`), fire held: sprite Y
  204 to 183, held 13 frames, back to 204, and again while fire stays down;
  stick up held 20 frames: no movement (`work/track.py`).
- The jump runs in three phases of 21 one-pixel steps: up and forward,
  forward, down and forward, 63 pixels across and 21 up (`$4391` room 1,
  `$935E` rooms 4 and 7).
- The title waits at `$1770` for `$DC00` to read exactly `$6F`. *live*
- F1 (the KERNAL's key byte `$C5` = 4) toggles `$1019` at `$7C70`; while it
  is 1 the interrupt chain leaves at `$EA31` before `$8C33`, so the
  in-play tune stops. It is not a pause. *live* (`work/pausetest.py`: with
  `$1019` = 1 the guardians kept moving and the tune pointer `$8C58` stood
  still; a second F1 started it again)
- Some code writes `$DC00` itself, at `$533A`, `$5D3E`, `$6366`, `$77F6`,
  `$87F6` and `$9466` (`$77` at `$533A`, `$69` at `$5D3E`, `$7B` at the
  other four). The effect on the next stick read was not
  tested.

## Mechanics

- **Death**: a touch is the VIC's sprite-sprite collision register `$D01E`,
  compared with exact values; each test has its own list. `$55B0` (rooms 5,
  6, 8, 9 and `$8E10`): `$11`, `$12`, `$14`, `$18` (twice), `$50`, `$90`, Mr
  Hat with one of sprites 0-3, 6, 7, which sets the touch flag `$4ACE` = `$20`. Room 1's
  `$1F70` (from `$1ED6`, `$1F69`, `$41A1`): `$11`, `$12`, `$14`, `$18` and
  `$58`, sprites 3 and 6 together. Room 3's ladder test `$5028` (from
  `$4B0C`, called at `$48FF` and fallen into from `$4AFD` when climbing
  down): `$14`, `$18`. `$4C40` (from `$8E08`, reached
  from `$4AE7` and `$4B8D`) calls `$B666`, which kills on `$90`, then tests
  a second read of the register for `$14` and `$18`. `$55B0` runs each step
  in every room but 1, 3 and 10, through `$5590` → `$BB10` → `$8E10`. Room
  10 runs no collision test. No list holds `$30`, the lift cabin.
  `$D01F` (sprite against background) is never read. Fixed hazards
  are positions: `$BB10` kills Mr Hat on a room's deadly spots only at an
  exact standing height (`$B4` bottom floor, `$5C` upper floor). `$A877` is
  the death: it copies the death shape from `$ACD8`, sinks him to the floor
  line (`$A8A0`), flashes him (`$A92D`) and dissolves him using the raster
  line as a random mask (`$A8F0`). *live*: in room 1 a guardian's touch sank
  him into the floor and he restarted at the room's entry
  (`reference/death.png`, `reference/room01-respawn.png`).
- **Lives**: four marks. Every death recolours one: `$A877` ends in
  `$1D86`/`$1700`. `$4C52`, the life loss of room 3's deaths, calls `$A877`
  and then `$4C73`, whose test for a mark coloured `$6C` never matches (the
  marks are `$BC` or `$CC` in every snapshot), so `$1700` recolours a
  second: by the code a death in room 3 costs two marks (not tested live).
  `$D8` = `$40` once the last is gone (`$1734`); every room's loop tests it
  (the template loops first) and goes to `$4475`, the end of the game: back to the title, then
  a new game through `$8020` and `$0870`. *live*: five deaths returned to
  the title (`work/go1.vsf`).
- **Score**: `$41DA` (and `$8AD0`, which also starts the score tick) adds one to the score's thousands digit (bitmap
  `$3D38`, carry from `$4206`), so every award is a multiple of 1,000; there
  is no carry past the hundred-thousands digit. Awards are counted calls:
  a treasure 10, 20, 25, 50 or 75 times (`$8E10` and `$B100`-`$B4BB`), room
  8's key 2, a door 2, room 11's block 10, room 6's dark bonus 10; `$120E`, `$1219`, `$1224`, `$122F`,
  `$123A` are the 10,000, 20,000, 25,000, 50,000 and 75,000 adders. *live*
  for four of the six (`work/scoretest.js`: the 1,000, 10,000, 25,000 and
  75,000 adders run in the kit's simulator on
  `play-room1.vsf`, the score's digits read back from the bitmap, gave
  001000, 010000, 025000 and 075000). The web screenshots' scores (25,000,
  150,000, 250,000) fit.
- Two 5,000-point pickups (`$5C2F`, `$6C3D`) look impossible to take (see
  "Corner cases").
- **Treasures** are taken by standing over them with the stick pulled down
  (`$7D`) (`$8E10`, `$B100`-`$B4BB`); switches and barriers work on touch.
  A taken object stays gone for the rest of the game: its colour is kept
  as an operand inside the room's set-up code and overwritten with `$CC`;
  the shared treasures and switches are remembered by flags at
  `$1371`-`$1389`, which `$BD5B` clears for a new game;
  and `$5678`, `$705E`, `$61DA` and `$92C0`, reached from the start of play
  `$6E00`, put the operands back.
- **Barriers and switches**: a barrier pushes Mr Hat back until the switch
  of its colour is taken. Five pairs: room 3's keyhole opens room 6's
  barrier, room 5's switch room 2's barrier, room 6's switch room 9's upper
  barrier, room 8's its lower one, room 2's switch the barrier in room 11.
  Each switch sets one flag; besides its own already-taken test and the
  redraw (`$B1B0`-`$B2C9`), only its barrier's routine reads it: `$1382`
  (written at `$B357`, read at `$B3AF`), `$1383` (`$B384`, `$B31E`), `$1384`
  (`$B3E7`, `$B43F`), `$1386` (`$B414`, `$B46B`), `$1380` (`$B2FE`, `$B4A2`).
  Traced; not tested live.
- **Room 9 in the dark**: the upper-floor door test stops early; unless Mr
  Hat carries room 6's object (`$F5` = `$28`), nothing left of X `$E8` on that
  floor reaches the chaser kill (`$7909`/`$81D6`) or the upper-floor exit to
  room 8 (`$7931`); the lower-floor exit (`$795C`) still works. Traced, not
  tested live.
- **Room 11 past X 255**: walking right past X 255 puts Mr Hat at X `$124`
  and switches his sprite off (`$B8B8`), inside the lift sprite's area;
  walking back left past 256 switches him on again at X `$0FE`. Traced.
- **Light**: rooms 6 and 9 are drawn dark (colour `$00`) unless `$22` =
  `$40`, which `$5519` sets when room 2's candle is taken and `$61E1`
  clears for a new game (`$5E10` room 6, `$7440` room 9). Room 6 draws its
  television and treasures only when lit (`$5ED8`, `$BDE2`), and its
  treasures, switch and barrier work only then (`$8F1E`); room 9's objects are drawn
  in the dark too. *live*: rooms 6
  and 9 set up with `$22` = 0 drew their corridors black, and with `$22` =
  `$40` lit, with their objects (`reference/room06-setup.png`,
  `room06-lit-setup.png`, `room09-setup.png`, `room09-lit-setup.png`). In
  the dark, room 6 has a hazard on its bottom floor (X `$C6`-`$F3`) that
  kills only then, and a 10,000-point bonus at X `$108` that counts only
  while its colour cell `$06A0` is not `$CC`: `$00` in the dark room, `$CC`
  in the lit one (`room6.vsf`, `room6-lit.vsf`).
- **Immunity**: the objects of rooms 3 and 7 call `$1250`, which writes
  `RTS` over the first bytes of the death `$A877` and of the life loss
  `$4C52`, and counts `$100F` up to `$FE` while `$BF30` steps the sprite
  multicolours `$D025`/`$D026`;
  `$BF4A` puts the bytes back. The noise effect at `$B4C0`-`$B653` plays
  meanwhile.
- **The lift** is in room 1 (`$4000`: Mr Hat and sprite 5, the cabin, move
  56 pixels a floor) and room 11 (`$8265`, `$8912`).
- **Room 1's way out**: take the black object on the top floor (X `$40`;
  sets `$BD` = `$60`), then walk to X `$50` on the bottom floor, which sets
  up room 3 (`$44C0`).
- **The end**: in room 11, on the bottom floor (Y `$B4`) anywhere left of X
  `$80`, level with the Golden Hat (the bitmap `$7C00`, drawn in cells 6-8 of
  rows 16-17 by `$7C50`).
  Room 11's rules (`$8265`) push Mr Hat back to the right on that floor
  unless X is `$B8` or more or the block at colour cell `$061A` is open
  (`$CC`); carrying room 5's object (`$F5` = `$EE`) opens it and scores
  10,000. `$7CC0` then gives the IRQ back to the KERNAL, sets `$1018` = 1
  and calls the title routine, which shows "WONDERFUL / YOU HAVE FINISHED
  YOUR MISSION" (`$BFA8`, screen codes at `$B7D8`) to the title tune and
  waits for fire; then `JMP $0870` starts a new game.
- **The ending needs no object in this copy.** Room 5's object cannot be
  taken: its set-up stores the colour `$2C` that the pickup tests for into
  `$D022` (`$586B`-`$5870`) instead of its cells, and the corridor fill
  paints `$04B8` `$CC`. Room 11's set-up likewise loads the block's fill
  (`$061A`, 2 by 6, colour from `$8503`) and never calls it, so the cell
  keeps the corridor's `$CC` and the block counts as open from the start.
  *live* (`work/room5take.py`, `work/room11win.py`, 3 October 2026): in
  room 5, Mr Hat on the pickup spot with the stick down took nothing, and
  with only `$04B8` poked to `$2C` took the object at once; in room 11,
  carrying nothing (`$F5` = `$81`), set on the bottom floor at X `$C0` and
  walked left, he reached `$7CC0` at X 127 and the end screen appeared
  (`reference/end-screen.png`). He was placed on that floor, not ridden
  there by the lift.
- **Game state** `$D8`: `$40` no lives left (`$1734`, after the last mark);
  `$50` set when a room's object is taken (`$4E3B`, `$5CC8`, `$6467`,
  `$6D7D`) and tested by each of the four takes (`$4E0F`, `$5CAC`, `$642C`,
  `$6D61`), so only one object is carried at a time; cleared when it is
  used (`$540F`, `$78CF`, `$7992`, `$82B2`). `$F5` says which object: `$20`
  room 2's, `$EE` room 5's, `$28` room 6's, `$AF` room 8's; shown in status
  cells `$07BE`/`$07E6`. Room 2's, room 5's and room 8's look impossible to
  take (their colour stores go to `$D022`: `$4F0A`, `$586B`, `$66E0`); room
  5's was tried live and could not be taken (above).

## Graphics

- Rooms are drawn in hires bitmap from tiles at `$AC00`-`$AFFF` (eight bytes
  a cell) and bitmaps kept with the room code, through the library at
  `$A400`-`$A6FF` (block copy `$A400`, cell fill `$A451`, colour fills `$A477`,
  `$A48B` and `$56ED` outside it, room clear `$A573`, tile draw `$A690`).
- Objects have one drawer each, among other shared code at `$A702`-`$ABEF`: keyhole, switch, two
  cones, round object, oval, painting, television, two bands, arrows,
  plant, pot, chest of drawers; more object bitmaps at `$B000`-`$B0FF` and in the room
  blocks (room 9's television `$7265`, the Golden Hat `$7C00`).
- Everything that moves is a hardware sprite: Mr Hat sprite 4, the lift
  cabin sprite 5, guardians on the others. The 28 shapes are pointers
  `$24`-`$3F` (`$0900`-`$0FFF`). Mr Hat: walking right `$2C`-`$2E`, left
  `$2F`-`$31`, a frame every nine one-pixel steps (`$5340`, `$5370`);
  climbing `$32`/`$33`; crouching `$2A`; dying `$27`, a buffer at `$09C0`
  into which `$1DDD` copies the death shape from `$ACD8`. He is multicolour
  from room 1 on: `$D02B` 11, `$D025` 2, `$D026` 13. The title's cast shows
  `$2C` on sprite 0 (`$B7A6`); `$2B` is a guardian's, on sprites 2 and 6.
- The dissolve (`$A8F0`) ANDs each byte of the death shape once with the
  raster line, four bytes a pass (`$09C0+x`, `$09D0+x`, `$09E0+x`, `$09F0+x`), 16
  passes of 82,504 cycles (84 ms) each; the flash before it (`$A92D`) steps
  `$D02B` 256 times. *live* in the simulator (`work/death-sim.js`, the
  raster from the cycle count, no interrupts): 74 set pixels down to 25.
- *Live*: one frame of room 1 rebuilt by `C64.renderFrame` from memory and
  the frame's register writes matches the emulator's picture in all
  104,448 pixels (`kit/c64/frame.py`, `work/frame-room1.json`).
- 119 writes go to `$D022` (69 `STA`, 49 `INC`, 1 `DEC`), which hires bitmap mode
  does not show. Several sit where a colour store or a call belongs (room
  9's door fills `$71CF`, `$794A` and treasure colours `$73CD`-`$73DD`, room
  8's `$666C`, `$66E2`, room 6's `$5EF3`): stores retargeted to switch
  things off. Who did it is unknown; they are in the image the magazine
  shipped.

- **The title font is damaged in the image.** The title set-up `$CDC0`
  copies the font `$CE00`-`$CFFF` to `$2800` every time the title is set
  up. In the image as shipped, 14 bytes of the source, `$CE48`-`$CE55`
  (the top halves of glyph 9, I, and of glyph 10, J, but its last two
  rows), hold `48 3C 32 26 2B 23 27 20 3F 36 51 22 22 22`, which is not a
  letter, while the copy at `$2800` still holds the glyphs
  (`00 00 3C 34 3C 18 18 18 00 00 07 05 07 07`): the copy was made before
  the damage, and the freezer saved both. So the first title is right,
  and every title after a game over (`$4475`), or after a cold start at
  `$086D` (which reaches `$CDC0` through `$0876`, `$16A3` and `$16D5`),
  copies the damaged bytes and
  draws the top halves of I and J as noise ("WITH", "SNAILY", "KNIFFY";
  the title's screen codes `$C000`-`$C058` use I but not J). The end
  message is drawn by the same set-up (`$BFA8`, text at `$B7D8`), so it
  always shows all four I's of "FINISHED" and "MISSION" broken
  (`reference/end-screen.png`). These are the only bytes in which source and
  copy differ. Nothing in the game writes them: no instruction stores to
  `$CE00`-`$CFFF` directly or through an index (`kit/c64/opcodes.py
  --refs`, reach 255); the indirect stores (`($FE),Y`, `($24),Y`) only
  ever get pointer high bytes of `$04`-`$06`, `$20`-`$37`, `$A0` and
  `$D8`, and the other pointers are Supermon's; the immediate loads of
  `$CE` are opcode bytes (`DEC`) written into self-modifying code; and the
  byte pattern appears nowhere else in memory. Where it came from is unknown. *live*, both
  ways (`work/versions/gotest.py`, store checkpoint on `$CE00`-`$CEFF`
  from the title through a whole game to the next title): in the disk's
  copy no store hit the font and the next title showed the broken
  letters (`reference/title-after-game-over.png`); in botowrap's version,
  whose `$CE48`-`$CE55` equal the clean copy at `$2848`, the same run
  ended on a clean title. *live*: the disk's game restarted at `$086D`
  showed the broken I on its very first title
  (`work/versions/d64-restart.png`); its memory at `$1773` differs from the
  frozen image only in `$2848`-`$2855` and the music counter `$C436`.
- **The ladder.** `gfx_ladder_row` (`$4802`, 24 bytes, three cells) is
  the one row the ladders of rooms 2, 3, 5, 6, 8, 9, 10 and 11 are made of. Room 3 (`$47DE`, 13
  rows) and room 2 (`$4E7A`, 17 rows) copy it down the bitmap themselves;
  rooms 5, 6, 8, 9, 10 and 11 aim the shared copy `$5713`'s operand
  (`$5718`/`$5719`) at it and call it (`$57B3` and `$57D0`, `$5E83`,
  `$664B`, `$719F`, `$8354`, `$854D`). Room 6's snapshot shows the bytes in
  19 rows. In the image the side cells are irregular from
  row to row (left `A8 1A 1A 1A 7A 1A 1A AA`, right
  `1A A8 1A 18 AE A8 A8 12`), which draws ragged rails with stray pixels
  (`reference/ladder-original-and-botowrap.png`: room 3 in VICE, left as
  the game draws it, right with botowrap's bytes put into the bitmap).
  Botowrap's version has three straight rails a side, with the rung
  carried into them (left `54 54 54 54 57 54 54 54`, right
  `2A 2A 2A 2A EA 2A 2A 2A`). That pattern is nowhere in the original's
  memory, so it is a redraw, not something restored from the game.
  Whether the original's ladder was damaged like the font or drawn that
  way is open: the damage would have had to spare the 8 bytes between
  the two cells, and nothing in the game writes `$4802`-`$4819` (two
  direct reads and the seven through `$5713`'s patched operand, which
  `opcodes.py --refs` does not see); *live*, no store hit it through a
  whole game in either version.

## Guardians

Every room's interrupt handler but room 10's (it has none) moves its guardians, often by patching its
own `INC`/`DEC` opcodes to turn round: room 6's patroller (`$608A`, X
`$80`-`$FE`, `$6096`), room 8's diagonal bouncer (`$683D`), room 9's floor
patroller (`$7627`/`$762A`), its chaser on the upper floor that follows Mr
Hat one pixel an interrupt, about 62 a second (`$7B70`), and the drops that fall from its lamps
(sprites 6, 7); room 11 moves sprite 3 towards Mr Hat on its top floor
(`$8660`); room 8's interrupt also sways sprite 7 one pixel left and right
with frames `$3D`/`$3E` (`$B993` → `$B97A` → `$B92D`). `$7000` flips the frames of sprites 0 and 1 for rooms 1, 2, 5
and 6.

## Sound

- The title player plays one tune: the title tune, also under the end message. The player
  (`$C080`-`$C373`) runs in front of the KERNAL interrupt, paced by CIA 1
  timer A, whose latch each pattern sets (`$C18C`): `$3E6A`, about 61.7
  interrupts a second on PAL.
- Format: a song is a list of order positions (`$CAC3`, `$CADB`); each plays
  a range of patterns (26 tables of 64 bytes at `$C443`-`$CAC2`: tempo,
  waveform per voice, AD, SR, pulse width, filter, first and last block and
  step, timer); each pattern plays a range of note blocks (`$CAF2` + 64n,
  16 steps per voice). A note byte is 0 hold, `$64` gate off, 1-94 an
  index into the frequency table (`$C374` low, `$C3D3` high, note n = 12 ×
  octave + pitch from C0). Notes carry no length and no instrument: a step
  lasts the pattern's tempo in interrupts, and the pattern sets all three
  voices' sound.
- The song length `$C43D` is 1, so only pattern 1 (blocks 1-10) and pattern
  2 (blocks 1-8) play, about 37 seconds a loop, 8 interrupts a step;
  voice 1 the melody (pulse), voice 2 a trill (triangle), voice 3 the bass
  (pulse). Order entries 3 and 6 name blocks that are not in the image
  (11-24 and 25-39), besides patterns whose blocks are present (pattern 5,
  blocks 2-4, in entry 3; patterns 10-12, blocks 1-9, in entry 6); entries
  2, 4 and 5 replay patterns 2 and 3, whose blocks are present.
- The frequency table is about a quarter of a semitone flat at the PAL
  clock: A4 is `$1CD6`, 433.5 Hz (checked); at the NTSC clock it is 450 Hz.
- A disabled editor feature: the flag `$C439` is only ever written 0; set,
  `$C1CF` would read keys (F7 all voices, 1, 2, 3 one voice alone) and call
  `$CB51`, which is note data. `$CAF4` holds the text `MUZA1`.
- In play one tune runs in every room, and a second tune has a player
  nothing reaches (the `JMP $89D0` at `$8A00` is itself never reached). The two players are twins (`$8C00`-`$8C89` with the
  note-off `$85DF`; `$89D0`-`$8A5B` with `$85D0`): voice 3 alone, triangle
  (`$11`), attack/decay `$20`, every note retriggered after the note-off
  zeroes `$D40D`-`$D414`; three tables read through pointers kept in the
  code's own operands, the in-play tune's at `$8C90`/`$8D30`/`$8D90` (95 notes, back
  to the first at pointer `$EF`), the unused one's at `$8A60`/`$8B00`/`$8B90`
  (105 notes, back to the second at `$C9`); a note lasts the length byte in
  interrupts (`$64F9` counts up to `$64FA`). The unused player sends its
  first column to the frequency's low byte; the in-play one sends it to `$D022`, so
  its notes sound at the high byte alone. That column's values differ
  between repeats of one note (`$2188`, `$2164`, `$213D`), so it may not be a
  tuning at all. The in-play player runs from the interrupt tail every
  room's handler ends in (`$8215` → `$BF30` → `$B530` → `$8C00` → `$7C70`,
  19 jumps to `$8215`); it rewinds while Mr Hat's pointer is the death
  frame `$27` (`$8C03`); F1 stops it (above). *live*: its pointer `$8C58`
  moved on over 150 frames in rooms 1, 2, 3, 5, 8, 9 and 11. *live* in the simulator: both
  ported players match the game's code, every SID write of 3,000 calls
  each (`work/voice3-test.js`).
- Effects on voice 3, each run at the end of an interrupt (`$B4C0`-`$B653`):
  one whose pitch is the raster line, the noise during immunity, a score
  tick. The jump sound `$41B0` is separate: it writes voice 2 (`$D408`,
  `$D40B`, `$D40C`) from the main loops, on the 21 rising steps of a jump.

## Text

The game's words are screen codes, in the order of the C64's own set.
The title's font at `$CE00` is drawn two cells high: glyph 0 blank, 1-26
the top halves of A-Z, 33-58 their bottom halves (code + 32), 29 and 61
"!", 59 a full stop, 60 a comma. The title's words are at `$C000`-`$C058`:
MR HAT, OCTOPUS, SNAILY, DYNKY (so spelt, as on the screen), KNIFFY, AND
ALL OTHERS, SYSTEMS PRESENTS A NEW GAME WITH. Nothing reads `DOUBLE` at
`$C007` or the `SY` at `$C015` that would make OCTOPUSSY. SCORE, ROOM and
STAGE are bitmap graphics, not text; the end message is at `$B7D8`.

## Leftovers

- **Lupenio's text**, PETSCII, printed by nothing. `$7E28`-`$7FE9`, its
  ending: "SIPE COPYRIGHT STUPITA ANNUNCIA CHE GIOCATORE ECCEZIONALE E
  BRILLANTE! SEI UNO DEI POCHI CHE HA RISOLTO QUESTO DIFFICILE GIOCO
  BASATO SULLE PERICOLOSE E FURTIVE AVVENTURE DI LUPENIO. NON ERA FACILE
  SCOPRIRE LA RELAZIONE TRA LE CHIAVI E LE PORTE... BENE, MOLTO BENE!! UNA
  STRETTA DI MANO AL RE DEI VIDEOGIOCHI CON LE CONGRATULAZIONI DELLA: S I
  P E. ORA RIPROVA CON 200.000 PUNTI ... PREMI F1" (checked at `$7FB5`).
  `$A1F6`-`$A35A`, its introduction: "...CA CASA PIENA DI PERICOLOSISSIMI
  GUARDIANI E TRAPPOLE MORTALI. ATTENTO AMICO MIO E RICORDA.... OGNI
  CHIAVE APRE UNA ED UNA SOLA PORTA PERCIO' FAI ATTENZIONE E CERCA DI
  TROVARE LA GIUSTA STRATEGIA DI GIOCO. CREATO, DISEGNATO E PROGRAMMATO DA
  ANDREA CUCCHETTO E FRANCESCO CHIOLA. UNO SPECIALE RINGRAZIAMENTO A:
  ANNA, CINZIA, MARCO E MARIO."
- **A dead ending**: the only pointer to the text is an immediate pair at
  `$7E19`/`$7E1D`, in `$7D70`-`$7E26` (a tune, the print, `JMP $8000`, which
  waits for F1 and restarts with a replay bonus of 200,000 points, then
  400,000: `$80B0` and `$8590`, which therefore never run; `$75F0` is 0 in
  every snapshot, and `$802D` only ever takes its redraw-000000 path), reached only from a `JMP $7D70` at `$7CF7` that follows an
  unconditional `JMP $0870`; it calls `$A000`, which is all zeros. Live code
  still writes into the text: the restart after the last life (`$4486` →
  `$8020`) puts '2' into `$7FC1`. The dead fragments `$7D01` and `$7D36`
  walk Mr Hat with the variables `$7CC0` still sets up. Room 9 keeps two
  doors that test for the objects carried from rooms 6 (`$28`) and 8
  (`$AF`), and a 20,000-point treasure whose tests can never pass, their fills patched out (above):
  keys and doors were Lupenio's subject. Put back as `JSR $56ED` at `$71CF`
  and `$794A` and `STA $06F3,X` / `$06A3,X` / `$06CB,X` at `$73CF`, `$73D4`,
  `$73D7` (a reconstruction, from the parameters loaded before each and
  the cells the room's tests read), the set-up paints both doors `$E0`
  and the treasure `$7C`/`$7C`/`$0C`, and the room shows two brick doors
  and the treasure that were in its bitmap all along. *live*
  (`work/room9-designed.py`; the frame matches the emulator's picture);
  play with them was not tried.
- **Supermon**, Jim Butterfield's monitor, `$97ED`-`$9FFF` (2,067 bytes, 15
  commands, tables `$9ED9`-`$9FFF`); its SETMSG call goes to `$96F0`, which
  sets `$01` = `$36` after it. No instruction outside it refers to it, no
  vector holds an address in it (`$0316` is `$FE66`, reset to it at `$92C0`),
  and its pages did not run in play (below).

## Corner cases

- `$1020` stores A at `$40BB` and takes its low nibble from `$40BB`, but
  its high nibble from `$400B`, which is the operand of an `STA $07FC` and
  always `$FC` (checked in four snapshots), so it returns `$F0`. `$A97C`
  compares that with `$10`, which never matches, so its check of the X
  high bit (`$A986`) never runs. Of the 42 calls, 18 pass the flag `$01`,
  which never asks for the check; 24 pass `$10` or `$11`, but 23 of their
  callers test the X high bit themselves first (`$1200`): 4 call only on
  the right half (`$8E7C`, `$B192`, `$B350`, `$B37D`) and behave the same
  either way; 19 call only on the left half and match there only because
  the check never runs. `$AB47` is not gated. The slip is load-bearing;
  what the flag was meant for is open.
- "Mr Hat is past X 255" is tested as the whole of `$D010` at 18 places
  (11 against `$29`, 7 against `$2F`; for example `$4BCC`, `$4C06`, `$6350`,
  `$647F`, `$6C09`, `$9450`, `$94BA`, `$7866`), and three more compare it
  with `$31`, `$20` and `$28`, so the answer depends on the other sprites' high bits too; room
  9's chaser (`$7B70`) compares only low bytes.
- Room 8 has barriers at exact X values: X `$52` pushes Mr Hat back, X `$8F`
  on to `$90`.
- Room 8's item (X `$38`) and lower bonus (X `$30`), room 5's two pickups
  (`$06C0`, `$04B8`) and room 2's at `$0684` and `$04F7` look impossible to
  take: nothing gives their cells the colour their tests want. Three of
  them are the carried objects of rooms 2, 5 and 8. Room 5's (`$04B8`) was
  tried live and could not be taken; the rest were not tried.
- Several jumps leave a subroutine without returning, so return addresses
  pile up on the stack (`$1FD3`, `$1ED3`, `$6D90` → `$491D`, four bytes each
  time while Mr Hat is hidden after a death in room 3).
- `$4F28` holds `$90` (a `BCC` among `NOP`s, likely the operand of a
  patched-out colour store) until room 2's barrier opens, and every new
  game sets it back. The carry there is always set (the drawers before it
  end in `$A400`'s `BCS`), so it never branches.
- Room 6's dark bonus is redrawn on every dark visit and nothing records
  that it was taken: it may be repeatable. Not tested.

## Hardware register census

| Register | Use | Where |
|---|---|---|
| `$D008`/`$D009` | Mr Hat's X and Y, stepped in place | about 400 instructions across the room code |
| `$D000`-`$D00F`, `$D010` | the guardians', the lift's and the X high bits | room code, `$1B04`-`$1BE3`, `$1C06`-`$1C81` |
| `$D015` | sprite enable, also compared as a whole byte, mostly as thresholds | `$16CA`, `$1B04`, `$1C1C`-`$1C7B`, `$7A30` |
| `$D01E` | sprite-sprite collision, the only way of dying by touch | the tests `$55B0`, `$1F70`, `$5028`, `$B666`/`$4C40`; read elsewhere only to clear it (`$170C`-`$173D`, `$A8DC`) |
| `$D011`, `$D018` | text for the title, bitmap for play (`$9265`, `$CDC0`); `$D011` bit 4 blanks the screen during set-up (`$A4FD`) | |
| `$D012` | raster line read as a random number (`$A8F0`), a pitch (`$B4C0`), and for timing (`$A944`, `$A960`, `$B54B`) | |
| `$D016` | never written | |
| `$D020`, `$D021`, `$D022` | border; `$D021` and `$D022` written but not shown in hires bitmap mode | |
| `$D025`-`$D02E` | sprite colours; `$D025`/`$D026` stepped during immunity (`$BF41`, `$BF44`), `$D02B` flashed at a death (`$A92D`) | |
| `$D400`-`$D418` | the music player (`$C11D`, `$C1FC`), the in-play tune (`$8C00`), effects (`$B4C0`-`$B653`, `$41B0`) | |
| `$DC00` | the joystick, read at 63 places as exact values; written at six | |
| `$DC04`/`$DC05`, `$DC0E` | CIA 1 timer A, the music's tempo | `$C106`-`$C1A0` |
| `$DC08`-`$DC0B` | the time-of-day clock, zeroed by the music's first interrupt `$C2EB`, never read | |

## Live tests

- `work/versions/bootcmp.py <image> <name>`: power-cycle, autostart one
  of the three copies, stop at `$1773` or `$086D`, save RAM and a
  snapshot (4 October 2026).
- `work/versions/gotest.py <snapshot> <name>`: from the title, start a
  game, play it out with seeded random stick input until the title set-up
  `$CDC0` runs again, with store checkpoints on `$CE00`-`$CEFF` and
  `$4802`-`$4819`; prints the font and ladder bytes and saves a
  screenshot. If no game over comes in 240 seconds it ends the game by
  poking `$D8` = `$40`; both runs lost every life before that. Disk copy:
  no store, broken letters; botowrap's: no store, clean letters (4
  October 2026).
- `work/track.py`: Mr Hat's sprite per frame under scripted input (walk,
  jump, stick up).
- `work/pages.py handover ...`: one non-stopping execute checkpoint per
  page, `$0200`-`$CFFF`, over about 45 seconds from the title through
  room 1 (fire, walking, a jump, a death). Pages that ran: `$08`, `$10`,
  `$16`-`$1F`, `$42`-`$46`, `$56`, `$57`, `$61`, `$6E`-`$70`, `$7C`,
  `$80`-`$82`, `$85`, `$8C`, `$92`, `$A4`-`$AA`, `$B2`, `$B4`, `$B5`,
  `$BD`-`$C3`. The monitor's pages and Lupenio's text did not run.
- `work/goroom.py`: every room's set-up started from play draws its room
  with the expected ROOM digit (and STAGE, but rooms 4 and 7).
- `work/room5take.py`, `work/room11win.py`: room 5's object cannot be
  taken; the ending is reached without it.
- `work/verifier*/`, `work/reports/verify-*.md`: the independent audits of
  the page, these two files and a sample of the listing's comments.
- `work/pausetest.py`: F1 stops the in-play tune and not the guardians.
- `work/scoretest.js`: the point adders, run on the snapshot's memory.
- `work/goroom.py ... 40`: rooms 6 and 9 with the light switch on.
- `kit/c64/frame.py capture` and `compare` on all eleven rooms, the dark
  and the lit rooms 6 and 9 and room 9 as designed: 0 pixels differ in
  each. Room 10 needed the recorder's beam phase fixed (kit-feedback.md).
