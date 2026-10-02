# Mr. Hat — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/handover.vsf` (`orientation.md`). *Live*
means observed in VICE (vice-mcp v3.13.1, PAL), with the script named.
Times assume PAL, 50.12 frames a second.

## Build

No version or build string was found. The image is a freezer backup of
the game on its title screen (`orientation.md`); the game's own BASIC line
survives at `$0801`: `10 SYS 2157` and the text `SYSTEM EDITOR<<<E **`
(`$0810`). Chiola's earlier game Lupenio (SIPE, 1988) left text and dead
code in the image ("Leftovers", below), and a copy of the Supermon
machine-code monitor sits at `$97ED`-`$9FFF`.

## Memory layout

| Thing | Where |
|---|---|
| Entry (`SYS 2157`) | `$086D`: `JSR $0876` (sets `$01` = `$36`, `JSR $16A3`, the title), `JSR $9265` (bitmap mode on), `JMP $087E` (clears `$F7`-`$FA`, `$44E0`, `$64F0`, `$64F1`, then `JMP $6E00`, the start of play) |
| Title | `$16A3`: KERNAL IRQ back to `$EA31`, clears `$2000`-`$3EFF`, `JSR $CDC0`, sprite colours, `JSR $1770` (the fire wait). `$16A0` is `JSR $A500` and falls into it |
| Title set-up | `$CDC0`: starts the music (`$C09B`), copies the font `$CE00`-`$CFFF` to `$2800`, text mode, `$D018` = `$1B`; then `$B683` draws the cast, or, when `$1018` is set, `$BFA8` the end message |
| Title words | screen codes at `$C000`-`$C058` ("Text") |
| Play screen | bitmap at `$2000`-`$3F3F`, colours at `$0400`, hires (`$D011` = `$3B`, `$D016` = `$C8`, never written anywhere in the image) |
| Status line | bitmap rows 23-24: SCORE digits in columns 13-18, ROOM in 24-25, STAGE in 31, each digit two cells high, drawn from the glyphs at `$1600` (16 bytes a digit, top cell first) |
| Mr Hat | hardware sprite 4: his position is the sprite's own registers `$D008`/`$D009`, stepped with `INC`/`DEC` in place; no other copy of it is kept *live* (`work/track.py`) |
| Lives marks | colour cells `$07B9`, `$07BA`, `$07E1`, `$07E2` (`$BC` shown); a death recolours one to `$CC`, grey on grey *live* (`$07B9` `$BC` → `$CC` after one death, `work/death1.vsf`) |
| Interrupts | title: `$0314` = `$C0AF` (music); play: each room installs its own handler (room 1 `$1C00`, which jumps to `$AAB2`), and most end through `$8215` → `$BF30` → `$8C12` → `$7C70`. `$01` = `$36` throughout |
| Room code | one block per room: set-up, interrupt handler, main loop, floor rules (table below) |
| Shared engine | walking `$5340`/`$5370`, ladder step `$4B20`, collision test `$55B0`, death `$A877`, score `$41DA`, graphics library `$A400`-`$A6FF`, object drawers `$A702`-`$ABEF`, tiles `$AC00`-`$AFFF` |
| Music | player `$C080`-`$C373`, data `$C374`-`$CDBF` |
| Leftovers | Lupenio's text `$7E28`-`$7FE9` and `$A1F6`-`$A35A`, a dead ending `$7CF6`-`$7E27`, an F1 wait `$8000`; Supermon `$97ED`-`$9FFF` |

## The rooms

`$100C` holds the room number, stored by each room's set-up (in BCD: room 10
is `$10`, room 11 `$11`). `$4ACD` is the entry code: the room Mr Hat leaves
writes it, and the next room's set-up reads it to place him. The table at
`$A817`-`$A85E` holds one trampoline per room, `JSR $A84E` (screen back on)
then `JMP` to the room's main loop.

| Room | Stage | `$100C` | Set-up | IRQ | Main loop |
|---|---|---|---|---|---|
| 1 | 1 | 0 | `$6E00` (via `$17DF`), stores at `$6F21` | `$1C00` | `$42EF` |
| 2 | 2 | 2 | `$4D80`, stores at `$4EAF` | `$510A` | `$51F4` |
| 3 | 2 | 3 | `$4642`, stores at `$478E` | `$48B0` | `$4910` |
| 4 | 2 | 4 | `$9000` with `$4ACD` = `$10`, `$28` or `$07` | `$B9AD` | `$9320` |
| 5 | 2 | 5 | `$573D` | `$596A` | `$5A60` |
| 6 | 3 | 6 | `$5E10` | `$608A` | `$6220` |
| 7 | 3 | 7 | `$9000` with `$4ACD` = `$40` or `$48` (`$95A0`) | `$B9AD` | `$9320` |
| 8 | 3 | 8 | `$65E0` | `$683D` | `$6A20` |
| 9 | 3 | 9 | `$7140` | `$7600` | `$76B0` |
| 10 | 4 | `$10` | `$8300` | none | `$8410` |
| 11 | 4 | `$11` | `$8480` | `$8660` | `$86B0` |

*Live*: each set-up, started from play (`work/goroom.py <set-up> <entry
code>`), draws its room with the ROOM and STAGE digits of the table
(`reference/room02-setup.png` to `room11-setup.png`).

The main loops are copies of one template. Rooms 6 and 8's loops
(`$6220`-`$6335`, `$6A20`-`$6B35`) are 278 bytes each and differ in 54, all
of them call and jump operands (checked byte for byte); room 9's loop
matches rooms 2, 5, 6, 8 and 11 instruction for instruction, with only the
addresses called differing. Rooms 3 and 4/7 differ more. What each room
adds is its own floor rules, hazards, guardians and objects.

Exits, from the room code: room 1 to room 3 (`$44C0` → `$4722`); room 2
right to 3 (`$4642`) and down its ladder to 6 (`$5E10`); room 5 left to 4
and down its ladder to 9; room 6's ladder up to 2, bottom right to 7;
room 8 to 7, to 9 and down its shaft to 10; room 9 left to 8, up to 5,
down to 11; room 10 up its ladder to 8; room 11 up its ladder to 9.

## Controls

- Joystick in control port 2. Every test is an exact value of `$DC00`, so
  a diagonal does nothing.

  | `$DC00` | Action |
  |---|---|
  | `$6F` (fire alone) | jump, the way Mr Hat faces (`$438D` room 1, `$5227`, `$76E3`, `$86E3` and the other loops) |
  | `$67` / `$6B` (fire with right / left) | another jump straight after one |
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
  is 1 the interrupt chain leaves at `$EA31` before `$8C33`, so room 1's
  in-play tune stops. It is not a pause. *live* (`work/pausetest.py`: with
  `$1019` = 1 the guardians kept moving and the tune pointer `$8C58` stood
  still; a second F1 started it again)
- Some code writes `$DC00` itself: `$7B` at `$87F4`, `$9450`, `$77F4`; `$77`
  at `$5338`; `$69` at `$5D3E`. The effect on the next stick read was not
  tested.

## Mechanics

- **Death**: a touch is the VIC's sprite-sprite collision register `$D01E`,
  read as exact values at `$55B0` (`$11`, `$12`, `$14`, `$18`, `$50`, `$90`:
  Mr Hat, sprite 4, with one of sprites 0-3, 6, 7), which sets `$4ACE` =
  `$20`; `$D01F` (sprite against background) is never read. Fixed hazards
  are positions: `$BB10` kills Mr Hat on a room's deadly spots only at an
  exact standing height (`$B4` bottom floor, `$5C` upper floor). `$A877` is
  the death: it copies the death shape from `$ACD8`, sinks him to the floor
  line (`$A8A0`), flashes him (`$A92D`) and dissolves him using the raster
  line as a random mask (`$A8F0`). *live*: in room 1 a guardian's touch sank
  him into the floor and he restarted at the room's entry
  (`reference/death.png`, `reference/room01-respawn.png`).
- **Lives**: four marks. `$4C52` loses a life, `$4C73` recolours a mark.
  `$D8` = `$40` once the last is gone (`$1734`); every room's loop tests it
  first and goes to `$4475`, the end of the game: back to the title, then
  a new game through `$8020` and `$0870`. *live*: five deaths returned to
  the title (`work/go1.vsf`).
- **Score**: `$41DA` (and its twin `$8AD0`) adds one to the score's thousands digit (bitmap
  `$3D38`, carry from `$4206`), so every award is a multiple of 1,000; there
  is no carry past the hundred-thousands digit. Awards are counted calls:
  a treasure 10, 20, 25, 50 or 75 times (`$8E10` and `$B100`-`$B4BB`), room
  8's key 2, a door 2, room 11's block 10; `$120E`, `$1219`, `$1224`, `$122F`,
  `$123A` are the 10,000, 20,000, 25,000, 50,000 and 75,000 adders. *live*
  (`work/scoretest.js`: each adder run in the kit's simulator on
  `play-room1.vsf`, the score's digits read back from the bitmap, gave
  001000, 010000, 025000 and 075000). The web screenshots' scores (25,000,
  150,000, 250,000) fit.
- **Treasures** are taken by standing over them with the stick pulled down
  (`$7D`) (`$8E10`, `$B100`-`$B4BB`); switches and barriers work on touch.
  A taken object stays gone for the rest of the game: its colour is kept
  as an operand inside the room's set-up code and overwritten with `$CC`,
  and `$5678`, `$705E`, `$61DA` and `$92C0`, reached from the start of play
  `$6E00`, put the operands back.
- **Barriers and switches**: a barrier pushes Mr Hat back until the switch
  of its colour is taken: room 5's switch opens room 2's barrier, room 6's
  opens room 9's upper barrier, room 8's its lower one, room 2's the
  barrier in room 11 (`$B100`-`$B4BB`, agent report 8; not tested live).
- **Light**: rooms 6 and 9 are drawn dark (colour `$00`) unless `$22` =
  `$40`, which `$5519` sets when room 2's candle is taken and `$61E1`
  clears for a new game (`$5E10` room 6, `$7440` room 9). *live*: rooms 6
  and 9 set up with `$22` = 0 drew their corridors black, and with `$22` =
  `$40` lit, with their objects (`reference/room06-setup.png`,
  `room06-lit-setup.png`, `room09-setup.png`, `room09-lit-setup.png`). In the dark, room 6 has a hazard on its
  bottom floor (X `$C6`-`$F3`) that kills only then, and a bonus that can
  only be taken then.
- **Immunity**: the objects of rooms 3 and 7 call `$1250`, which writes
  `RTS` over the first bytes of the death `$A877` and of the life loss
  `$4C52`, and counts `$100F` up to `$FE` while the sprite colours flash;
  `$BF4A` puts the bytes back. The noise effect at `$B4C0`-`$B653` plays
  meanwhile.
- **The lift** is in room 1 (`$4000`: Mr Hat and sprite 5, the cabin, move
  56 pixels a floor) and room 11 (`$8265`, `$8912`).
- **Room 1's way out**: take the black object on the top floor (X `$40`;
  sets `$BD` = `$60`), then walk to X `$50` on the bottom floor, which sets
  up room 3 (`$44C0`).
- **The end**: in room 11, on the bottom floor (Y `$B4`) with X below `$80`,
  under the Golden Hat (the bitmap `$7C00`, drawn at cell 6,16 by `$7C50`),
  once the block at colour cell `$061A` is open (`$CC`). That needs `$F5` =
  `$EE`, the object carried from room 5 (`$5CD7`), and opening it scores
  10,000. `$7CC0` then gives the IRQ back to the KERNAL, sets `$1018` = 1
  and calls the title routine, which shows "WONDERFUL / YOU HAVE FINISHED
  YOUR MISSION" (`$BFA8`, screen codes at `$B7D8`) to the title tune and
  waits for fire; then `JMP $0870` starts a new game. Traced; a live attempt
  that jumped straight into room 11's set-up did not keep Mr Hat where he
  was poked, so the ending was not reached in the emulator.
- **Game state** `$D8`: `$40` killed, `$50` carrying an object; `$F5` which
  object (`$28`, `$AF`, `$EE`), shown in status cells `$07BE`/`$07E6`.

## Graphics

- Rooms are drawn in hires bitmap from tiles at `$AC00`-`$AFFF` (eight bytes
  a cell) and bitmaps kept with the room code, through the library at
  `$A400`-`$A6FF` (block copy `$A400`, cell fill `$A451`, colour fills `$A477`,
  `$A48B`, `$56ED`, room clear `$A573`, tile draw `$A690`).
- Objects have one drawer each at `$A702`-`$ABEF`: keyhole, switch, two
  cones, round object, oval, painting, television, two bands, arrows,
  plant, pot, chest of drawers; more at `$B000`-`$B0FF` and in the room
  blocks (room 9's television `$7265`, the Golden Hat `$7C00`).
- Everything that moves is a hardware sprite: Mr Hat sprite 4, the lift
  cabin sprite 5, guardians on the others.
- *Live*: one frame of room 1 rebuilt by `C64.renderFrame` from memory and
  the frame's register writes matches the emulator's picture in all
  104,448 pixels (`kit/c64/frame.py`, `work/frame-room1.json`).
- 122 writes go to `$D022` (69 `STA`, 49 `INC`), which hires bitmap mode
  does not show. Several sit where a colour store or a call belongs (room
  9's door fills `$71CF`, `$794A` and treasure colours `$73CD`-`$73DD`, room
  8's `$666C`, `$66E2`, room 6's `$5EF3`): stores retargeted to switch
  things off. Who did it, author or cracker, is unknown.

## Guardians

Each room's interrupt handler moves its guardians, often by patching its
own `INC`/`DEC` opcodes to turn round: room 6's patroller (`$608A`, X
`$80`-`$FE`, `$6096`), room 8's diagonal bouncer (`$683D`), room 9's floor
patroller (`$7627`/`$762A`), its chaser on the upper floor that follows Mr
Hat one pixel a frame (`$7B70`), and the drops that fall from its lamps
(sprites 6, 7); room 11 moves sprite 3 towards Mr Hat on its top floor
(`$8660`). `$7000` flips the frames of sprites 0 and 1 for rooms 1, 2, 5
and 6.

## Sound

- One tune plays: the title tune, also under the end message. The player
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
  (pulse). Order entries 2-6 name blocks that are not in the image.
- The frequency table is about a quarter of a semitone flat at the PAL
  clock: A4 is `$1CD6`, 433.5 Hz (checked); at the NTSC clock it is 450 Hz.
- A disabled editor feature: the flag `$C439` is only ever written 0; set,
  `$C1CF` would read keys (F7 all voices, 1, 2, 3 one voice alone) and call
  `$CB51`, which is note data. `$CAF4` holds the text `MUZA1`.
- In play, room 1 has a tune of its own (`$8C00`-`$8C89`, tables at `$8C90`,
  `$8D30`, `$8D90`), stopped and started by F1 (above). A second, at
  `$89D0`-`$8A5B`, has no caller.
- Effects on voice 3, each run at the end of an interrupt (`$B4C0`-`$B653`):
  one whose pitch is the raster line, the noise during immunity, a score
  tick; and the jump sound `$41B0`.

## Text

The game's words are screen codes, in the order of the C64's own set.
The title's font at `$CE00` is drawn two cells high: glyph 0 blank, 1-26
the top halves of A-Z, 33-58 their bottom halves (code + 32), 29 and 61
"!", 59 a full stop, 60 a comma. The title's words are at `$C000`-`$C058`:
MR HAT, OCTOPUS, SNAILY, DYNKY (so spelt, as on the screen), KNIFFY, AND
ALL OTHERS, SYSTEMS PRESENTS A NEW GAME WITH. Nothing reads `DOUBLE` at
`$C006` or the `SY` at `$C015` that would make OCTOPUSSY. SCORE, ROOM and
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
  400,000), reached only from a `JMP $7D70` at `$7CF7` that follows an
  unconditional `JMP $0870`; it calls `$A000`, which is all zeros. Live code
  still writes into the text: the restart after the last life (`$4486` →
  `$8020`) puts '2' into `$7FC1`. The dead fragments `$7D01` and `$7D36`
  walk Mr Hat with the variables `$7CC0` still sets up. Room 9 keeps two
  doors and keys (`$F5` = `$AF` from room 8, `$28`) and a 20,000-point
  treasure whose tests can never pass, their fills patched out (above):
  keys and doors were Lupenio's subject.
- **Supermon**, Jim Butterfield's monitor, `$97ED`-`$9FFF` (2,067 bytes, 15
  commands, tables `$9ED9`-`$9FFF`); its SETMSG call goes to `$96F0`, which
  sets `$01` = `$36` after it. No instruction outside it refers to it, no
  vector holds an address in it (`$0316` is `$FE66`, reset to it at `$92C0`),
  and its pages did not run in play (below).

## Corner cases

- `$1020` stores A at `$40BB` and takes its low nibble from `$40BB`, but
  its high nibble from `$400B`, which is the operand of an `STA $07FC` and
  always `$FC` (checked in four snapshots): the right-half test in `$A97C`
  never applies, so a spot there matches at X and at X + 256.
- "Mr Hat is past X 255" is tested as the whole of `$D010` against `$29`
  or `$2F` (`$4BCC`, `$4C06`, `$6350`, `$647F`, `$6C09`, `$9450`, `$94BA`,
  `$7866`), so the answer depends on the other sprites' high bits too; room
  9's chaser (`$7B70`) compares only low bytes.
- Room 8 has barriers at exact X values: X `$52` pushes Mr Hat back, X `$8F`
  on to `$90`.
- Room 8's item (X `$38`) and lower bonus (X `$30`), room 5's two pickups
  (`$06C0`, `$04B8`) and room 2's at `$0684` and `$04F7` look impossible to
  take: nothing gives their cells the colour their tests want. Not tested
  live.
- Several jumps leave a subroutine without returning, so return addresses
  pile up on the stack (`$1FD3`, `$1ED3`, `$6D90` → `$491D`, four bytes each
  time while Mr Hat is hidden after a death in room 3).
- `$4F28` can hold `$90`, a `BCC $4F14` inside a run of `NOP`s, which loops
  for ever unless the carry is set; the carry there was not established.
- Room 6's dark bonus is redrawn on every dark visit and nothing records
  that it was taken: it may be repeatable. Not tested.

## Hardware register census

| Register | Use | Where |
|---|---|---|
| `$D008`/`$D009` | Mr Hat's X and Y, stepped in place | about 400 instructions across the room code |
| `$D000`-`$D00F`, `$D010` | the guardians', the lift's and the X high bits | room code, `$1B04`-`$1BE3`, `$1C06`-`$1C81` |
| `$D015` | sprite enable, also tested as exact values | `$16CA`, `$1B04`, `$1C1C`-`$1C7B`, `$7A30` |
| `$D01E` | sprite-sprite collision, the only way of dying by touch | `$55B0`, `$170C`-`$173D`, `$B666` |
| `$D011`, `$D018` | text for the title, bitmap for play (`$9265`, `$CDC0`); `$D011` bit 4 blanks the screen during set-up (`$A4FD`) | |
| `$D012` | raster line read as a random number (`$A8F0`) and a pitch (`$B4C0`) | |
| `$D016` | never written | |
| `$D020`, `$D021`, `$D022` | border; `$D021` and `$D022` written but not shown in hires bitmap mode | |
| `$D027`-`$D02E` | sprite colours, flashed during immunity | |
| `$D400`-`$D418` | the music player (`$C11D`, `$C1FC`), room 1's tune (`$8C00`), effects (`$B4C0`-`$B653`, `$41B0`) | |
| `$DC00` | the joystick, read at 63 places as exact values; written at six | |
| `$DC04`/`$DC05`, `$DC0E` | CIA 1 timer A, the music's tempo | `$C106`-`$C1A0` |
| `$DC08`-`$DC0B` | the time-of-day clock, zeroed by the music's first interrupt `$C2EB`, never read | |

## Live tests

- `work/track.py`: Mr Hat's sprite per frame under scripted input (walk,
  jump, stick up).
- `work/pages.py handover ...`: one non-stopping execute checkpoint per
  page, `$0200`-`$CFFF`, over about 45 seconds from the title through
  room 1 (fire, walking, a jump, a death). Pages that ran: `$08`, `$10`,
  `$16`-`$1F`, `$42`-`$46`, `$56`, `$57`, `$61`, `$6E`-`$70`, `$7C`,
  `$80`-`$82`, `$85`, `$8C`, `$92`, `$A4`-`$AA`, `$B2`, `$B4`, `$B5`,
  `$BD`-`$C3`. The monitor's pages and Lupenio's text did not run.
- `work/goroom.py`: every room's set-up started from play draws its room
  with the expected ROOM and STAGE digits.
- `work/pausetest.py`: F1 stops room 1's tune and not the guardians.
- `work/scoretest.js`: the point adders, run on the snapshot's memory.
- `work/goroom.py ... 40`: rooms 6 and 9 with the light switch on.
- `kit/c64/frame.py capture` and `compare` on room 1: 0 pixels differ.
