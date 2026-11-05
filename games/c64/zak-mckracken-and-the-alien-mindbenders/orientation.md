# Zak McKracken and the Alien Mindbenders — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Three disk images from the C64 Preservation Project's G64 collection at
the Internet Archive (`C64_Preservation_Project_10th_Anniversary_Collection`,
the `G64.zip` listing, folder `z`), downloaded 5 November 2026:

| File in the collection | Saved as | SHA-256 of the `.g64` |
|---|---|---|
| `zak_mckracken_boot[activision_1988](manual)(!).zip` | `work/boot.g64` | `4a8e51076e33898d6a26ca0c78cf0e41555440fcf64a3a87be91a6e057be4619` |
| `zak_mckracken_s1[activision_1988](manual)(!).zip` | `work/side1.g64` | `7a8f824d54778dd8c16795aa4905835de7c8f13a738a173abd83c7dac0100282` |
| `zak_mckracken_s2[activision_1988](manual)(!).zip` | `work/side2.g64` | `372b866424485aaa6e6e03f11cb7f71972331d91a736d9fbee5ae70594938d04` |

The original English release: a boot disk and one disk with two sides.
The collection marks it `(!)`, a verified good dump; nothing on any of
the three is a crack, a trainer or a menu.

The boot disk's directory, read with `kit/c64/disk.py`, names two files:

| File | Blocks | Bytes | Loads at |
|---|---|---|---|
| `BOOT` | 1 | 95 | `$02A7`-`$0305` |
| `AA` | 158 | 39,938 | `$0400`-`$9FFF` |

and 478 sectors in use that no file holds. The two game sides have no
directory at all: track 18 holds game data, so `disk.py` lists noise.
The game reads both sides sector by sector with its own drive code.

## From power-on to play

1. Attach `work/boot.g64` to drive 8 and autostart it (`LOAD"*",8,1`,
   then `RUN` is not needed: `BOOT` starts itself). Warp is fine for
   every wait below.
2. When the load finishes, the screen asks "Put in side 1 and push
   joystick button." Attach `work/side1.g64` to drive 8 and press fire
   on joystick port 1 (hold it about a second).
3. The opening sequence plays from side 1: Zak asleep and dreaming, the
   title over his bed, the credits. It ends at the next prompt; it was
   run in warp here, so its length at normal speed was not measured.
4. The screen asks "Put in side 2 and push joystick button." Attach
   `work/side2.g64` and press fire on port 1.
5. Zak wakes in his bedroom: the verbs and his inventory appear below
   the picture, and the cursor follows joystick port 1 (port 2 does
   nothing). This is steady-state play.

Snapshots, all in VICE's format, saved without ROMs:

| Snapshot | When | What it is for |
|---|---|---|
| `work/entry.vsf` | a checkpoint at `$02CB`, the `JMP $0400` at the end of `BOOT`, then one step: stopped on `$0400` with `AA` loaded | the hand-over; `AA` is byte for byte in memory at `$0400`-`$9FFF` |
| `work/startup.vsf` | `entry.vsf` run to a checkpoint at `$043C`: the start-up's copies are done, and the heap clear that follows has not run | the listing's image: the only state that holds both the start-up code and the code it copies under the I/O chips and the KERNAL |
| `work/play-bedroom.vsf` | step 5, in the bedroom before any input | steady-state play |

`work/entry.ram`, `work/startup.ram` and `work/play-bedroom.ram` are the
64 KB of RAM from each, read with the emulator's `vice_memory_read` on
the RAM bank.

## Steady state

In play the game runs with all the ROMs banked out: `$01` keeps its low
bits at `%100` (all RAM) and sets them to `%101` around each access to
the chips. The KERNAL is out, so the hardware vectors are the game's
own: IRQ at `$FFFE` = `$0C1C`, NMI at `$FFFA` = `$1479` (read in the
bedroom). The video chip is in bank 3 (`$C000`-`$FFFF`): text screen at
`$CC00`, character set at `$F800`, multicolour text.

Where things sit after the start-up:

| Range | What |
|---|---|
| `$0100`-`$019A` | a routine copied into the bottom of the stack page |
| `$0400`-`$77D4` | the program: the script interpreter, the actors, the screen, the disk, the input; its variables and tables from `$6214` |
| `$77D5`-`$C7FF` | the resource heap, cleared at start-up and filled from the disk during play: rooms, scripts, costumes and sounds |
| `$CAD0`-`$CBC8` | code copied from `$4AD5` |
| `$CC00`-`$CFFF` | the text screen and the sprite pointers |
| `$D000`-`$D7FF` | RAM under the I/O chips: the script interpreter's opcode table (`$D000`/`$D100`) and code, copied from `$9800` and `$84D7` |
| `$F040`-`$F709` | data and code copied under the KERNAL from `$77D9` and `$8A53` |
| `$F800`-`$FBFF` | the character set, copied from `$7859` |

The opcode table and the code under the I/O chips are copied from the
heap's own area, which the start-up then clears. The listing is built
from `work/startup.vsf` for that reason, with `--entry work/entry.vsf`.

Nothing is reloaded as a whole: rooms, scripts, costumes and sounds
are loaded into the heap as the player meets them (`kit/skills/core/15-parts`
counts that as data fetched into a buffer, so the game is one part).
The scripts are programs for the SCUMM interpreter, read from the disk
during play; they are counted under `coverage.virtual` in `game.json`.
A music resource carries 6502 code of its own, which runs from wherever
the heap put it (seen at `$C304` in the bedroom); see `facts.md`.

## Disk files in memory

| File | Where in the hand-over | Bytes equal | Notes |
|---|---|---|---|
| `BOOT` | `$02A7` | 93 of 93 | overwrites the BASIC vectors at `$0300`-`$0305`: `$0302`, BASIC's idle loop, becomes `$02A7`, so it runs as soon as it is loaded |
| `AA` | `$0400` | 39,936 of 39,936 | the whole program, its tables and the material the start-up copies away; `$909D`-`$97FF` and `$9A00`-`$9FFF` are filler |

## The loader, in a paragraph

`BOOT` loads over the BASIC vectors at `$0300`, so the machine jumps
into it when the load finishes. It blanks the screen, sets the volume,
loads `AA` to `$0400` through the KERNAL (`SETLFS` device 8, `SETNAM`
"AA", `LOAD`) and jumps to `$0400`. `AA`'s start-up at `$0400` banks
the ROMs out, and its routine at `$7C59` sends 512 bytes from `$7D7B` to
the 1541's memory at `$0500` with sixteen `M-W` commands of 32 bytes
(the drive's program, and after it the first 48 bytes of the start-up
code at `$7F4B`, sent along), then starts it with `U3`, and from
then on reads the game sides through that code with its own transfer
routine on the serial bus (`$DD00`). The C64 side of that transfer is
part of the program and is in the listing; the drive's side is not
analysed, by policy.
