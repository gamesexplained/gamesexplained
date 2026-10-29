# Barbarian — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

The analysed image is Palace Software's 1987 disk release, the two sides
of one disk, from the C64 Preservation Project's collection of G64 images
on the Internet Archive (`C64_Preservation_Project_10th_Anniversary_Collection_G64.zip`,
entries `b/barbarian_s1[palace_1987](!).zip` and
`b/barbarian_s2[palace_1987](!).zip`). The `(!)` is the project's mark
for a verified good dump of an original disk.

| File | Side | Header | SHA-256 |
|---|---|---|---|
| `barbarian_s1[palace_1987](!).g64` | 1, "combat practice" in the manual | `GCR-1541`, 365,464 bytes | `1db548f79a7387c931cd0b146dd6a5b7d3dd7959e75133e1ad214d6f469ed2d4` |
| `barbarian_s2[palace_1987](!).g64` | 2, "fight to the death" | `GCR-1541`, 365,464 bytes | `204d8daf98efd6c85c11c60673c11e4b2eea778a94ca9b07cefc086db3cc5602` |

They are copied into `work/` as `side1.g64` and `side2.g64`.
`kit/c64/disk.py` read all 683 sectors of each with no bad checksum. Both
sides are named `BARBARIAN DISK ` (ids `AA` and `BB`) and hold the same
five file names, every one listed as 0 blocks long:

| File | Loads at | Bytes | Side 1 and side 2 |
|---|---|---|---|
| `BARBARIAN` | `$0300`-`$052A` | 555 | identical: the boot loader |
| `V1` | `$1000`-`$1FFF` | 4,098 | differ in 3,185 bytes |
| `B1` | `$0800`-`$CAFF` | 49,922 | differ in 19,445 bytes |
| `B2` | `$D800`-`$DBFF` | 1,026 | differ in 853 bytes |
| `B3` | `$E000`-`$FFEF` | 8,178 | differ in 1,647 bytes |

The BAM marks every sector of both sides as used. Of the 409 used
sectors no file holds, 400 are zeros and 9, on track 17, are two more
files. The directory lists them as two deleted entries with blank names
(type `$00`, at offsets 32 and 64 of track 18 sector 1), so a directory
listing shows only five:

| Chain | Loads at | Bytes | Side 1 and side 2 |
|---|---|---|---|
| 17/1, 17/7, 17/13 | `$CB45`-`$CD64` | 544 | identical: the fast loader's C64 half |
| 17/2, 17/8, 17/14, 17/20, 17/4, 17/10 | `$CB00`-`$CFFF` | 1,280 | differ: the game's tables, loaded last, over the fast loader |

No trainer, cracktro or menu stands in front of the game: the image is
the original.

## From power-on to play

1. Power-cycle (`reset(rpc, "hard")` in `kit/c64/vice.py`) and autostart
   `work/side1.g64` (or `side2.g64`). VICE's defaults run the drive's own
   processor; no `vicerc` was needed. `BARBARIAN` loads over the KERNAL's
   vectors at `$0300`: its `$0302` (BASIC's warm start) points to `$0334`,
   so it starts itself.
2. The screen goes blank and the border flashes while the loader brings
   in `V1`, `B1`, `B2` and `B3`. On 29 October 2026 the boot loader
   reached its last instruction, `jmp ($8000)` at `$034A`, 85 seconds
   after the autostart call (VICE v3.13.2, PAL, warp asked for).
3. The game starts at `$8009` and plays a demo fight with `DEMO` in the
   panel under the arena. On side 1 the demo changes backdrop between
   fights (the volcano and the forest were seen).
4. **F1** chooses the mode: the first press after the load showed `2PLR`
   with the clock at 90; after **Q** (back to the demo) it showed `1PLR`.
   Hold each key for a second: the keys are read from the main loop.
5. **F7** starts the fight. Player 1 is the left-hand barbarian, on
   joystick port 2 (`lda $DC00,x` at `$84E9` with X = 0); player 2 reads
   `$DC01`, port 1.

The snapshots, each saved without ROMs:

| Part | Snapshot | State |
|---|---|---|
| practice | `parts/practice/work/entry.vsf` | the hand-over: a stopping checkpoint on `$034A`, one instruction stepped, PC = `$8009` |
| practice | `parts/practice/work/play-1p.vsf` | Q, F1 (`1PLR`), F7, about two seconds later: both fighters standing (`work/shots/practice-play-1p-b.png`) |
| tournament | `parts/tournament/work/entry.vsf` | the same, from `side2.g64`, PC = `$8009` |
| tournament | `parts/tournament/work/play-1p.vsf` | Q, F1, F7, about two seconds later: the first fight in Drax's hall (`work/shots/tournament-play-1p.png`) |

`work/entry.py <side>` makes an entry snapshot from power-on, and
`work/newgame.py` with `work/saveplay.py` the play snapshot.

The live tests run from copies of the play snapshots, each under a name
of its own: `snapshot_load` in `kit/c64/vice.py` keeps a snapshot in the
emulator's folder by its file name, and refuses a different file under a
name it already holds, such as the two sides' `play-1p.vsf`: `work/practice-play-1p-b.vsf` (side 1, a few passes into the
one-player bout) for `bug2.py`, `bug4.py`, `claire.py` and `keys.py`;
`work/t-play-1p.vsf` (side 2) for `ending1.py` to `ending4.py`.
`verify.py` holds the damage, points and loop-pace runs. The recorded
frames are `work/frame-goblin.json` (side 1's demo in the volcano, the
goblin dragging the loser off) and `work/frame-side2.json` (side 2's demo
in the throne room), made with `kit/c64/frame.py` by `frame1.py` to
`frame4.py`; the pages carry what they need of them as `BB_FRAME` and
`BB_FRAME2`.

## The parts

| Part | Folder | What it is | Snapshot the listing is built from |
|---|---|---|---|
| 1 | `parts/practice` | side 1: combat practice, one or two players, by the volcano and in the forest | `work/entry.vsf` |
| 2 | `parts/tournament` | side 2: the fight to the death, against Drax's warriors in his throne room and the hall of arches, and Drax at the end | `work/entry.vsf` |

The two sides are two loads of the whole of memory, and the manual says
they load in any order: neither stays when the other is loaded, and no
part lies over another. Their engines are the same code at different
addresses: from `$8600` on, side 2's code sits 366 bytes, and from `$9400`
on 364 bytes, after side 1's, the tournament's own code taking the room
(found by matching 16-byte pieces of side 2's `$8000`-`$CAFF` in side 1).
The graphics at `$0800`-`$43FF` and `$4800`-`$5FFF` are the same at the
same addresses on both sides.

## Steady state

- `$01` = `$25`: the I/O chips in, BASIC and the KERNAL out. The game owns
  the hardware vectors: IRQ `$FFFE` = `$93A5`, NMI `$FFFA` = `$93D6` (an
  `rti`) on side 1. The CBM80 signature at `$8004` with both vectors at
  `$8009` restarts the game on a reset.
- The video chip's bank is 1 (`$DD00` bits 0-1 = 2, `$4000`-`$7FFF`);
  `$D018` = `$18` puts the screen at `$4400` and the bitmap at `$6000`;
  `$D011` = `$3B` and `$D016` = `$18`: multicolour bitmap mode.
- The fighters are drawn into the bitmap, not made of sprites: a recorded
  frame of play (`parts/practice/work/frame-play.json`) has only sprite 7
  switched on, and 355 bytes of RAM changed during it.
- The interrupt: a raster interrupt at lines `$72` and `$FA` sets the
  background colour (`$D021`) for the band below the panel and the
  border band, and runs work of its own on the second; CIA 1's timer A
  (latch `$2710`) and timer B (latch `$5161`) also interrupt, calling
  `$9D73` and `$97F4` on side 1.
- The main loop is `$80BB`-`$80FD` on side 1: a chain of 22 calls ending
  in the keyboard scan at `$9246` and `jmp $80BB`.
- Nothing is reloaded during play.

## The loader, in a paragraph

`BARBARIAN` (`$0300`-`$052A`) blanks the screen and reads the two
hidden files through the drive's own commands: `U1` reads track 18
sector 1, `B-P` moves to the track and sector of a directory entry
(offsets 35 and 67, the bytes `$23` and `$43` at `$0505`), and the
routine at `$03BE` follows that chain into memory. The first is the fast
loader's C64 half, at `$CB45`. It then loads `V1`, `B1`, `B2` and `B3`
in turn through `jsr $CB45` (`$034D`-`$0388`, the names at `$0508`).
After the first, `V1`, it copies `$1000`-`$1FFF` into the RAM under the
I/O chips at `$D000`-`$DFFF` with `$01` = `$20` (`$0389`), out of the
way of `B1`. `B2` loads at `$D800`, into colour RAM. The second hidden
file, loaded last, puts the game's tables at `$CB00`-`$CFFF` over the
fast loader. `$04D9` sends `UJ`, which resets the drive, and the loader
jumps through `$8000`. Only the hidden table file was followed into the
game; the loader itself is not annotated.

## The emulator

`python3 kit/scripts/tools.py status`: `release v3.13.2,
v3.13.2-linux-x86_64-gui.zip`. `check-emulator` on 29 October 2026: 57 of
57 passed, nothing failed.
