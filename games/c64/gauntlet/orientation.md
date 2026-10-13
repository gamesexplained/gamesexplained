# Gauntlet — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

The contributor's file is `gauntletus_gold_1986cyan1.g64`, 309,954 bytes,
SHA-256 `bb80a1e2eee6df8d2c4d7f9a7d114fbf2cb47b22c52fdbe2e7a311c00a8d1772`.
Its header reads `GCR-1541`, version 0, 42 tracks: a GCR image of a whole
disk, not a sector image. The directory lists 144 files in plain sight:

| File | Load address | Length |
|---|---|---|
| `gauntlet` | `$0302` | 590 |
| `gaunt.spr` | `$2000` | 385 |
| `glove.bin` | `$2000` | 257 |
| `gauntfont $7000` | `$7000` | 4,096 |
| `spic f gauntlet` | `$6000` | 10,001 |
| `moded option` | `$4000` | 10,001 |
| `datatitle 244` | `$6400` | 508 |
| `gauntprog $8000` | `$8000` | 20,465 |
| `dittidata 146` | `$6400` | 153 |
| `player-$e000` | `$E000` | 1,761 |
| `datatreasure 446` | `$6400` | 446 |
| `objdis` | `$C800` | 2,048 |
| `plyrs.spr` | `$2000` | 8,192 |
| `gaunt chr $4800` | `$4800` | 12,288 |
| `pinn232 5000` | `$1388` | 632 |
| `level 001` to `level 128` | `$1E00` | 81 to 510 each |
| `spic` | `$2000` | 6,912 |

No crack intro, trainer or menu appeared on the way in, and the credits
screen is the publisher's own. Whether the disk is an untouched original
is not known: the image's file name says only "US Gold 1986".

## Checking the emulator

`tools.py status` named the build `release v3.13.2,
v3.13.2-linux-x86_64-gui.zip`. `check-emulator` passed 57 of 57 on
11 October 2026 (Linux x86_64, no display), so none of
`workarounds.md` applies. The machine is PAL.

## From power-on to play

`work/route.py` does all of this from a hard reset and stops at the
hand-over; the times are wall-clock with warp on during the loads.

1. Hard reset (power cycle), then autostart the image's first file,
   `gauntlet`. It loads at `$0302` over BASIC's vectors and runs itself.
2. About 75 seconds later the credits screen appears ("Programmed for US
   Gold by Gremlin Graphics", "Press space to continue"). Press SPACE,
   held about a second: a short tap is often missed.
3. The controls screen ("Player one: joystick 1, magic button: space bar.
   Player two: joystick 2, magic button: function keys"). Press SPACE
   again; the character-selection program loads.
4. The selection screen ("One or two players"). Joystick 1 moves a glove.
   The glove's position is `$38A2`/`$38A3`; with `$38A2` in `$82`-`$89`
   and `$38A3` in `$34`-`$4C` it points at ONE and `$FD` becomes 1. Fire
   on joystick 1 then takes one player. A fire press with `$FD` still
   `$FF` (pointing at nothing) is ignored.
5. Push joystick 1 up and left for most of a second, so the glove points
   at Thor the Warrior (`$38A4` = 0), and press fire. "The challenge
   awaits" appears and the game's files load: about 40 seconds with warp.
   The selection program ends with `JMP $8000` at `$34E2`: that is the
   hand-over, saved as `work/entry.vsf` with the machine stopped on the
   `JMP`.
6. The game shows a "Gauntlet / press fire" panel for each player at the
   bottom of a black screen. Fire on joystick 1: the panel reads
   "Warrior, score 000000, health 2000", "Level: 001" is shown while the
   maze loads, and play begins.
7. `work/play-level1.vsf`: saved about 30 seconds into level 1 with the
   Warrior standing in the maze and health counting down (1566). This is
   the image the disassembler and the listing are built from.

## Which image to analyse

At the hand-over only `gauntprog $8000` (`$8000`-`$CFF0`, every byte
as on disk), the font at `$7000`, the selection program and the title data
are in memory: the game loads its graphics, music player and object code
itself after the jump. The play snapshot holds all of them, and
`gauntprog` there differs from the disk file only in 222 bytes of
variables, so the play snapshot is the one to disassemble and to build
the listing from.

The disk's files, mapped onto the play snapshot in 16-byte pieces
(`work/mapfiles.py`):

| File | Lands at | Bytes equal |
|---|---|---|
| `gauntprog $8000` | `$8000` | 20,243 of 20,465 |
| `gaunt chr $4800` | `$4800` | 11,007 of 12,288 |
| `player-$e000` | `$E000` | 1,679 of 1,761 |
| `objdis` | `$F000` (loaded at `$C800`, moved) | 1,972 of 2,048 |
| `datatreasure 446` | `$E800` (moved) | 446 of 446 |
| `dittidata 146` | `$EA00` (moved) | 153 of 153 |
| `datatitle 244` | `$1000` (moved) | 508 of 508 |
| `pinn232 5000` | `$1388` | 632 of 632 |
| `plyrs.spr` | `$7000`, in part | 3,951 of 8,192 |
| `gauntfont $7000` | `$6000`, in part | 1,092 of 4,096 |
| `level 001` | `$0A00` (loaded at `$1E00`) | 81 of 81 |
| `gauntlet`, `spic`, `spic f gauntlet`, `moded option`, `gaunt.spr`, `glove.bin` | not in play memory | the loader, the title picture and the selection screen |

## The parts

One part. Each level file is loaded into a buffer at `$1E00` while the
"Level" screen shows, and the maze ends up at `$0A00`; the engine stays
where it is. That is data fetched during play, not a part
(`kit/skills/core/10-orient`).

## Steady state

- `$01` = `$35`: RAM at `$A000` and `$E000`, I/O at `$D000`.
- Hardware vectors in RAM: IRQ `$FFFE` = `$8268`, NMI `$FFFA` = `$827F`
  (a bare `RTI`, so RESTORE does nothing). The IRQ handler checks for a
  raster interrupt and jumps through `$0314`.
- The raster chain, read from the code and from a recorded frame
  (`work/frame-play.json`): `$8663` moves sprites 0 and 1 down the
  screen at four raster lines taken from `$8529`, with their Y from
  `$8524` (writes on lines 43, 86, 127 and 161), then points `$0314` at
  `$8579`. `$8579` runs the game's per-frame work and the status-panel
  split from line 207, and `$86AB` points `$0314` back at `$8663`. Before
  a disk load `$82E8` puts the KERNAL's `$EA31` back in `$0314` and
  banks the KERNAL in (`$01` = `$36`).
- Video: bank 1 (`$DD00` = `$C6`), `$4000`-`$7FFF`. The maze area is
  multicolour characters, screen `$4400`, characters `$4800` (`$D018` =
  `$13`), 38 columns and 24 rows, scrolled. The status panel from line
  208 is screen `$4000`, characters `$6000` (`$D018` = `$09`).
- Reloaded per level: the maze (`level nnn`, into `$1E00`, then `$0A00`).

## The loader, in a paragraph

`gauntlet` loads at `$0302`, so BASIC's idle-loop vector sends the
machine straight into it at `$0330`. It blanks the screen, copies the
KERNAL ROM into the RAM beneath it, and decrypts the rest of itself by
XORing each byte with a running sum of its own first bytes. It then
loads and shows the title picture and the credits. After the
controls screen it loads `spic` at `$2000`, the character-selection
program, whose glove picks the number of players and the hero. `spic`
loads the game's files through the KERNAL and ends with `JMP $8000`.
The game then loads its own graphics, music and object code before the
first level. Not annotated further, by policy.
