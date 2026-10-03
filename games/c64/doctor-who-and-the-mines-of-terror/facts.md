# Doctor Who And The Mines Of Terror — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/entry.vsf`, the hand-over snapshot named
in `orientation.md`.

## Build

A single packed program file (`orientation.md`). The depacker leaves the
game at `$484D` with the KERNAL banked in; the game banks it out itself
(`$01` = `$35`) and banks it back only to save (`$958A`). A loader stub at
`$7F00`-`$7F52` that prints "PLEASE WAIT -- STILL LOADING" and jumps to
`$484D`, and a prologue at `$4800`-`$484C` that never runs, are left over
from the release the file was made from.

## Memory layout

| Thing | Where |
|---|---|
| Zero page | every variable named in `symbols.json`: countdown `$1B`-`$1D`, lives `$1E`, battery `$1F`, camera `$20`-`$2D`, programmer `$2F`-`$3B` and `$FF`, pockets `$3C`-`$41`, markers `$42`-`$45`, throws `$46`-`$4D`, score `$57`-`$59`, oxygen `$F1` |
| Glyph-merge operand pointers | `$03`-`$16`, pixel masks `$17`-`$1A`, copied from `$4A4E` |
| Status screen and its font | `$0400`, glyphs for codes `$94`-`$FF` at `$04A0`-`$07FF` |
| Splinx Programmer | font `$0800`, sprites `$0B00`, screen `$0C00`, colours parked at `$1000` |
| Map row pointers | `$0A80`/`$0AC0` |
| Block pointers, terrain classes | `$1400`/`$1500`, `$1600` |
| Item names, lives field, digit glyphs | `$1770`, `$1720`, `$1730` |
| Object tables, 80 objects | `$1850`-`$1EFF` |
| Music | `$1F00`-`$2D3F`, player `$74C0`-`$7649` |
| Character colours | `$2F00` |
| Block definitions, 256 x 4x4 characters | `$3000`-`$3FFF` |
| Play-area character set | `$4000`-`$47FF` |
| Status screen source | `$4B00`-`$4EFF` |
| Sprite images | `$5000`-`$73FF`, pointers `$40`-`$CF` |
| Play screens | `$7800` and `$7C00`; `$7800`-`$7D7F` is also the save block |
| Code | `$484D`-`$4A85` (start-up), `$7440`-`$7649`, `$8000`-`$CFF5`, `$FC8C`-`$FF6E` |
| Cavern map | `$E000`-`$FBFF`, under the KERNAL |

## Timing

- The main loop (`$7476`) waits in `$80DA` for raster line `$FA` once per
  pass, so a pass is at least one PAL frame, 50 a second when nothing
  overruns.
- `$80DA` counts frames in `$53`-`$55`. It subtracts 1, in decimal, from
  the three-byte counter `$1B`-`$1D` only when `$53` and `$54` wrap to zero
  together (the `BNE`s at `$80EA` and `$80EE`), once every 65,536 frames,
  about 21.8 minutes; the `AND #$3F` test after them is then always true.
- The counter starts at BCD 010800 on the first game (*live*: the only
  writes from the hand-over are `$4996`-`$499C`, leaving `$1D`,`$1C`,`$1B`
  = 01 08 00) and at 010805 on a later new game (`$9408`-`$9414`). No code
  prints it; it is added to the score at the end (below).

## Controls

`$8F24` reads the stick in control port 2 (`$DC00`) and six keyboard
rows, each into its own zero-page byte, and sets movement flags
(traced: `$8F3C`-`$9058`):

| Input | Flag | Effect |
|---|---|---|
| stick left, Z | `$CB` = `$81` | walk left (*live*) |
| stick right, X | `$CB` = `$01` | walk right (*live*) |
| stick up, `;` | `$CC` = `$01` | climb up |
| stick down, `/` | `$CC` = `$81` | climb down |
| fire, RETURN | `$CD` = `$FF` | jump |
| F1 | `$D0` | move the pocket selector `$3C` through 0-4 (*live*: 0, 1, 2, 3, 4, 0) (`$A530`) |
| F3 | `$CF` | put the held item in the first free pocket, a marker in its slot, or with empty hands take the selected one out (`$A575`) |
| F5 | `$D2` | standing still, pick up the object in front (`$A6B4`, `$A929`); use the held item (`$BB28`) |
| F7 | `$D1` | with a direction, throw the held item (`$A68A`) |
| S | `$D3` | the Splinx Programmer (*live*) |
| R | `$E8` = `$12` | forced regeneration (*live*: message, lives 5 to 4) |
| D, CTRL+D, L | `$E8` = `$80`, `$C0`, `$FF` | the save menu, but only where the Doctor stands on tile `$23`: everywhere else `doctor_update` clears `$E8` (`$C902`-`$C909`; *live*: D beside the TARDIS does nothing) |

## Graphics

Three raster bands (`$8010`-`$80D7`), checked against the emulator's
picture by a frame capture (*live*: `frame.py compare`, 104,448 of
104,448 pixels):

1. Raster 256 to 78: VIC bank 0, `$D018` = `$11`, screen `$0400`,
   characters from `$0000`. The status bar uses codes `$94`-`$FF`, so the
   video chip reads its font from `$04A0`-`$07FF`, the rows of the same
   screen below the status bar. Start-up copies `$4B00`-`$4EFF` there and
   builds the letters and digits from the character ROM (`$48F5`-`$493E`):
   code `$DC` is A, `$F6` is 0. Digit 9's glyph would sit under the sprite
   pointers at `$07F8`, so 9 is drawn with code `$F5` (`$1730`).
2. From raster 78: bank 1, `$D018` = `$E3`/`$F3` (screen `$7800` or
   `$7C00`, characters `$4800`), fine scroll from `$5E` and `$5F`.
3. From raster 86: `$D018` = `$E1`/`$F1`, characters `$4000`. `$7440` clears
   `$4800`-`$4FFF`, so the one character row of band 2 is blank.

- The world is a map of 56 rows by 128 blocks at `$E000`-`$FBFF`, row *r*
  at `$FB80` − `$80`*r*; each block is 4x4 characters from `$3000`. Two
  screens are drawn in turn and swapped (`$52`), the coarse scroll spread
  over three frames (`$8C32`) and the hardware scroll in between.
- Colour RAM is computed from the characters through `$2F00` (`$8EB8`).
- The map is split into seven zones by the Doctor's position (`$56`,
  `$AA3D`, every 8 frames); a zone swaps in its own shapes for 16
  characters (`$ABCF`) and wakes its own objects.
- Up to eight objects are hardware sprites at once, all multicolour
  (`$81DA`, `$8133`); objects `$30`-`$4F` can also be drawn into the
  background as characters, composited per pixel pair into 32 spare
  character codes (`$8310`, `$8652`).
- 17 map cells change in play (`$AE02`, state `$1D00`-`$1D10`).

## Text

- **Screen codes** on the Splinx Programmer screen at `$0C00` and on the
  loading picture left at `$0400` in the hand-over image.
- **A private alphabet** for everything the game prints: a letter is its
  ASCII code plus 155 (`A` = `$DC` ... `Z` = `$F5`), a digit *n* is `$F6` +
  *n*, `$94` is a space and `$00` ends a string.
- Item names, ten bytes each at `$1770` + `$1720`[object]: 2 SPLINX,
  `$30`-`$33` MARKER 1-4, `$34` PICK AXE, `$35` MAT, `$36` CRYSTAL, `$37`
  PASS CARD, `$38` SPANNER, `$39` PLATFORM, `$3A` AIR MASK, `$3B` BOX,
  `$3C`/`$48`/`$4C` DETONATOR, `$3D` EXPLOSIVES, `$3E` CAPSULE, `$3F`
  ACTIVATOR, `$40`-`$45` and `$4A` CIRCUIT, `$46`/`$47` EGG, `$49`
  CHEMICALS, `$4B` GEM, `$4D`-`$4F` SPANNER.
- Messages are chains of strings through the pointer tables
  `$95CB`/`$9626`, printed by a scroller on status row `$0450` in step with
  raster `$C8` (`$92E3`).

## Mechanics

- **Lives.** `$1E` = 5 at the start (*live*), one figure each in the
  item-name field at `$1770` (`$94AC`), which the status bar shows when
  the Doctor holds nothing. A death decrements it (`$912F`); below 0 is
  GAME OVER.
- **Deaths.** `$E8` holds twice an index into the message table at
  `$90EF` (`$9109`):

  | `$E8` | Cause | Set at |
  |---|---|---|
  | `$06` | THE EXPLOSION | `$C1F6` |
  | `$08` | prints GAME OVER as the cause | `$C0C2`, when the rising level `$51` passes the Doctor |
  | `$0A` | A SHOCK FROM A CONTROLLER | `$CE5A` |
  | `$0C` | A FALL, a drop of `$60` or more | `$CD8B` |
  | `$0E` | FALLING ON A STALAGMITE, tiles `$74`/`$51` | `$CA67` (*live*) |
  | `$10` | SUFFOCATING | `$CAC2` |
  | `$12` | FORCED REGENERATION, key R | `$9051` (*live*) |
  | `$14` | SUFFERING A MADRAG BITE | `$B96F` |
  | `$16` | BEING ATTACKED BY A BABY MADRAG, near an egg | `$B902` |

  EXPOSURE TO RADIATION is a message nothing in the table points at.
- **Regeneration.** The Doctor restarts at the current restart point
  (`$1D29`, nine points in `$9059`-`$907C`); `$907D` makes a point current
  when he comes within `$14` of it.
- **Oxygen.** `$F1` is set to 50 and counts down once a pass while the
  Doctor's Y high byte is 2 or more (unless the tile is `$39`/`$04`) or he
  stands on tile `$3F`; holding the AIR MASK refills it; at zero he
  suffocates (`$CA90`-`$CAC2`). *live*: 0 and untouched while he walks
  the start cavern (Y below `$0200`).
- **Jumps.** 24 frames up, 16 level, then a fall, the direction fixed at
  take-off (`$A0D4`).
- **Pockets and throws.** Four pockets `$3E`-`$41`, four marker slots
  `$42`-`$45`; two thrown items can be in flight (`$46`-`$4D`).
- **Splinx** (object 2). Mode `$FF`: 0 shut down, 1 follow the Doctor, 2
  execute the program. The program is ten steps at `$30`-`$39`; commands
  1-4 go to markers 1-4, 5 returns to the Doctor, 6 waits, 7 picks up the
  nearest free item, 8 drops it, 9 recharges on character `$5E`. The
  battery `$1F` is 24 when full (*live*) and loses 1 every 1024 frames
  while Splinx follows or runs a program (`$B1EA`); recharging adds 1
  every 8 frames. In the programmer, the stick moves the command cursor
  `$3A` (*live*) and the step pointer `$2F`; fire stores the command.
- **Lift and carrier.** The lift (object `$0E`, `$A13C`) visits eight stops
  in turn and waits 127 frames at each; the carrier (object `$0F`,
  `$A2B9`) runs between two ends. The Doctor boards the carrier only at Y
  exactly `$0450` (`$A395`) and the lift only at a height difference of
  exactly 8 (`$A294`).
- **Objects 3-5, 6-9, controllers `$10`-`$28`.** Waypoint walkers
  (`$C28E`), patrols on routes at `$C404` (`$C44D`), and controllers on
  routes at `$764A` (`$CD9A`) whose touch kills.
- **The madrag** (objects `$0A`/`$0B`) guards two eggs, fetches an egg that
  has been moved back to its nest, takes one from Splinx, and bites; its
  behaviour runs twice a pass (`$B680`). A baby madrag (`$0D`) hatches
  when the Doctor comes near a free egg.
- **Object `$0C`** goes after the CRYSTAL, from the Doctor's hands or a
  pocket, and carries it off (`$B48A`). Whether it is the Master is not
  shown by the code.
- **Using items** (`$BACC`): the pick axe digs at three sites, three hits
  each; the spanner works at eight points; detonators and explosives are
  armed; the activator at three points ends the game (`$E8` = 2, the
  escape pod); the pass card opens a way (`$16A0`).
- **Fuses and explosions** (`$C09A`): an armed charge counts down,
  flashes, then destroys every object within `$20` (`$80` sideways for the
  explosives) and may kill the Doctor. The explosives blown near
  (`$0E60`, `$0068`) start a rising level `$51`, one step every 128
  frames.
- **The machinery** (`$B9B6`): circuits set exactly in their slots at Y
  `$0390` stop four moving objects (`$4F`); chemicals brought to
  (`$0290`, `$0588`) change the map.
- **The code lock** (`$BD35`-`$BFD9`): three buttons, a six-press sequence
  dealt from a 186-byte deck with seeds from the frame counter; a wrong
  press deals a new one; success sets `$4E`. The clue panel (F5 with empty
  hands at x `$0A14`-`$0A33`, y `$05C6` up) shows in turn a number 1-5
  (`$A1`-`$A5`), a shape and a letter W R B G Y (`$F6 $F5 $F7 $F8 $F9`);
  the shapes 0-5 are characters `$FD $FA $FE $FB $FC $FF`, drawn in the
  hand-over image's graphics set as triangle, square, circle, cross,
  diamond and question mark. Deck byte = 8 x colour + shape; the code is
  the six bytes from the (number)-th occurrence of the clue's colour and
  shape, so its first shape is the clue's. The deck's first seven entries
  match the outer band of the printed code card read from its top corner
  (by eye, from the contributor's photograph). Success also sets switch
  cell 13 to block `$D5` (`$BF62`). The `$4E` test at `$BB05` is
  overwritten by the PASS CARD test at `$BB15`.
- **Spanner bolts** (`$BBBC`): each of the eight points is switch cell 0-7,
  block `$E0` (a clamp on a ladder); undoing it writes `$E1`, the clamp
  drawn open. Point 5 needs the Doctor below it (`$BBB4`).
- **Switchable cells**: start-up writes all 17 from `$1D00` into the map
  (`$AECA` from `$4A3C`); the hand-over image's map predates that for
  cells 0, 1, 9, 11 and 14.
- **The end** (`$9102`, `$E8` = 2 escape pod, 4 TARDIS): the countdown is
  added to the score (zeroed first if object 0's Y high byte is below 3),
  then a bonus of 1024 doubled once for each of the CRYSTAL, the TIRU
  plans (the CAPSULE, `$3E`) and Splinx held or pocketed, once for the
  TARDIS, and once if heatonite production was halted (`$4F` with a
  qualifying object, or `$51`). The rating: below 4100 VERY DISPLEASED,
  below 20000 DISPLEASED, below 40000 PLEASED, else VERY PLEASED. F1 plays
  again (`$9282`).
- **Saving** (`$94FF`): F1 cassette, F3 disc, F5 back. It copies zero page,
  the object tables and the status rows into `$7800`-`$7D7F`, sets `$7800`
  to `$FF` and saves that block as "DRWHO"; the start-up restores it when
  `$7800` is not zero (`$49C6`). After saving it jumps through `$A000`,
  which with the BASIC ROM in is a BASIC cold start: the game does not
  resume.

## Sound

- Music: two voices, sawtooth, at `$74EA`; five tunes chosen from the
  Doctor's map position, silence as tune 5. *live*: voice 1 plays a
  sawtooth note in the start cavern and `$E1` stays 1 frame after frame.
- Effects: 24 on voice 3, 13 parameter tables at `$C677`; a lower number
  interrupts a higher one (`$C7C7`); updated every other frame (`$C818`),
  which reads the voice 3 envelope `$D41C`.

## Hardware register census

From every instruction in the traced code with an operand in `$D000`-
`$DFFF` (colour RAM aside).

| Register | Where |
|---|---|
| `$D000`-`$D007`, `$D010` | sprite positions: `$B00F`-`$B059` (programmer), `$FE80`-`$FE90` (TARDIS) |
| `$D011`, `$D012` | start-up, raster bands, `$80DA`; raster reads in `$8D0B`, `$931B`, `$B02D`, `$B15D` |
| `$D015`-`$D01D` | sprite enables and modes: `$8138`-`$81BE`, `$AF83`-`$AFE2`, `$FE7A`-`$FE88` |
| `$D018`, `$D016` | raster bands; programmer `$AFC6`; `$9594` |
| `$D019`, `$D01A` | start-up; `$9367`, `$94F2`, `$AF88`, `$B140` |
| `$D020`-`$D02A` | colours: start-up, `$815E`, `$AFE7`-`$AFF6`, `$FEA2`, `$FF31`-`$FF41` |
| `$D400`-`$D40B` | music, voices 1 and 2: `$755D`-`$7631` |
| `$D40E`-`$D414`, `$D418`, `$D41C` | effects on voice 3, volume: `$C7CF`-`$C8A5` |
| `$DC00`-`$DC02` | keyboard and stick: `$8F3C`-`$8FD2` |
| `$DC0E` | stops CIA1 timer A at start-up |
| `$DD00`, `$DD02` | VIC bank: raster bands, `$AFB2`-`$AFC1` |

Not named by any traced instruction: the filter, `$D01E`/`$D01F`
(collisions are worked out in software), the CIA timers beyond the one
stop. `STA $D400,Y` at `$755D` reaches the SID through an index.

## Open questions

- `$E8` = 8 (the rising level) prints GAME OVER as the cause of death
  while lives remain (`$90F3`).
- `$90CC` stores `$64`, not a BCD value, into the score's low byte on the
  first restart point.
- Controller state 6 is an `RTS` that ends the whole controller loop for
  that pass (`$CE77`).
- The self-modified dispatches at `$C2BF` and `$CDF7` accept only the
  states they were written for; another value lands mid-instruction.
- The `$16A0` value computed from `$4E` at `$BB05` is overwritten at
  `$BB15`.
- `$881D` does not clear the drawn flag of object `$4F`.
- `$8652` reads the overlay glyphs from `$0000`-`$07FF`, not `$4000`: is
  that where they are?
- Who object `$0C` is.
- How a saved game is loaded: nothing in the program calls LOAD.

## Live tests

| Test | Result |
|---|---|
| Frame capture, rebuild compared with the emulator's picture | 104,448 of 104,448 pixels |
| Writes to `$1B`-`$1D` from the hand-over | `$499A`, `$499E`; 010800 |
| `$1E` and the lives field at play start | 5; five figures |
| F1 pressed six times, `$3C` read | 0 1 2 3 4 0 |
| S, then stick down, `$3A` read | the programmer opens; cursor moves |
| `$1F` at play start | 24 |
| R pressed | `$E8` = `$12`, FORCED REGENERATION scrolls, lives 4 |
| D pressed beside the TARDIS | nothing; `$E8` back to 0 |
| Walk right until a fall | FALLING ON A STALAGMITE, a life lost |
| Twelve frames stepped in play, SID and `$E1` read | music plays; `$E1` stays 1 |
