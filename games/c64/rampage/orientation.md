# Rampage — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`rampage[activision_1987](pal)(!).g64` from the C64 Preservation Project
10th Anniversary Collection on the Internet Archive (the collection's G64
zip, file `c64pp-g64-zip/r/rampage[activision_1987](pal)(!).zip`; the
`(!)` is the collection's mark for a verified dump), fetched on 13
November 2026 at the contributor's request. 294,094 bytes, SHA-256
`9fc5605d96e872071474ccadefcff779c782b2020ee34612b64a296c321f5e4c`.
Kept as `work/rampage-pal-1987.g64`.

The header reads `GCR-1541`, version 0, 84 half-track slots (42 tracks),
largest track 7,928 bytes: a bit-level image of the original disk, not a
sector image.

This is Activision's European release of 1987, the conversion by Catalyst
Coders, with no trainer or crack. The same collection holds a second
original, `rampage[activision_1988](!).g64`, Activision's American
release of 1988: a different program on a disk with no file directory.
It was not analysed.

The directory, as `kit/c64/disk.py` lists it (several names hold control
codes):

| Blocks | Name | Loads at | What it is |
|---|---|---|---|
| 0 | `LOADER  C 1987` | `$02A7`-`$03FF` | the autostarting boot loader |
| 664 | `BLOCKS FREE.` | | a fake entry of two bytes |
| 0 | `LOADER2`, `PROTECTION` | | fake entries whose chains loop |
| 6 | one byte, `$00` | `$F000`-`$F4FF` | stage two: the protection check |
| 5 | `\` | `$C000`-`$C3FF` | the last loader stage, and the first half of the music driver |
| 11 | `PART1` | `$C600`-`$CFFF` | the "Activision presents" screen |
| 41 | `PART2` | `$4000`-`$67FF` | the first loading picture |
| 17 | `PART3` | `$2000`-`$2FFF` | sprite shapes, copied to the RAM under the I/O area at `$D000` |
| 61 | `PART4` | `$0400`-`$4000` | game data and code |
| 101 | `PART5` | `$6800`-`$CBFF` | game code and data |
| 41 | `PART6` | `$4000`-`$67FF` | the second loading picture |
| 23 | `PART7` | `$E000`-`$F5FF` | character sets and screens |
| 41 | `PART8` | `$4000`-`$67FF` | game data |

The block counts of the first entries are false.

## From power-on to play

On VICE 3.14.0 (vice-mcp release `v3.14.0-linux-x86_64-gui.zip`, Linux
x86_64), default settings: true drive emulation of a 1541, no `vicerc`,
PAL.

1. Power-cycle (a hard reset), attach the G64 to drive 8 and autostart it
   (`LOAD"*",8,1`). The screen goes black with `RAMPAGE` in white at the
   top left.
2. **The protection decides whether the boot goes on.** About ten seconds
   in, the C64 either goes on loading or resets to the `READY.` prompt.
   The loader is the one `games/c64/ik-plus/orientation.md` describes,
   and in VICE it passes on some boots only: on 13 November 2026 the
   first boot reset and the second passed. When the machine comes back
   at `READY.`, autostart again. `work/scripts/try_boot.py` loops boots
   until one passes.
3. On a pass the screen shows the Activision logo and `PRESENTS`, then
   the loading picture (the three monsters over the Rampage logo), and
   the load goes on for about two minutes at normal speed.
4. The game starts on a black screen headed `COLLECT ITEMS`, a list of
   what the windows hold. It stays there until fire is pressed on the
   joystick in port 2.
5. Fire on port 2 brings the newspaper screen: a strip each for George,
   Lizzie and Ralph, each reading `READY FOR ACTION`, and `PRESS FIRE TO
   JOIN THE ACTION`. Fire on port 2 joins as George, fire on port 1 as
   Lizzie and the `=` key as Ralph; a joined strip shows a headline and
   the monster's face. A few seconds after the first player joins, play
   begins: the monsters drop in from a blimp on day 1.
6. Snapshots, all saved without ROMs:
   - `work/loading-presents.vsf`: the load a moment after the protection
     passed, with `ACTIVISION PRESENTS` on screen. With the G64 attached,
     loading it replays the rest of the load without the lottery.
   - `work/entry.vsf`: **the hand-over and the analysed image**, stopped
     on `$8314`, the game's first instruction, after the last loader
     stage's `JMP $8314` at `$CD12`. `$01` = `$37`.
     `work/scripts/mkentry.py` makes it from `loading-presents.vsf`.
     **The listing is built from this image**:
     `python3 kit/scripts/listing.py games/c64/rampage games/c64/rampage/work/entry.vsf --entry games/c64/rampage/work/play-day1.vsf`.
   - `work/play-day1.vsf`: day 1 in play, George joined on port 2, the
     other two monsters played by the computer.

## Steady state

- **Banking:** `$01` = `$35` in play: all RAM, with the I/O chips visible
  at `$D000`-`$DFFF` and both ROMs out. The game owns the processor's
  hardware vectors in RAM at `$FFFA`-`$FFFF`: NMI `$7800`, reset `$785C`,
  IRQ `$789A` at the top of the frame.
- **Interrupts:** the raster IRQ is a chain of five handlers, each
  writing the next one's address into `$FFFE`: `$789A` → `$7979` →
  `$7A15` → `$7AB1` → `$7B4A` → `$789A`, recorded with `kit/c64/frame.py
  capture` on `work/play-day1.vsf` (the vector is written on lines 46,
  216, 233, 248 and 292). The handlers reuse sprites 2 to 7 for the three
  monsters, two sprites side by side in each of several rows, and switch
  the character set between the status lines and the city.
- **Video:** bank `$C000`-`$FFFF` (`$DD00` = `$94`). Two screens, `$F400`
  and `$F800`, with sprite pointers written to both `$F7F8` and `$FBF8`.
  `$D018` is `$EB` over the status lines (character set `$E800`) and
  `$E9` from line 76 down (character set `$E000`). The sprite shapes the
  disk carries are in the RAM under the I/O area, `$D000`-`$DFFF`; the
  monsters' sprites are drawn at run time into `$F280`-`$F3FF` and
  `$FC00`-`$FFBF`.
- **Code and data:** every file but the loader's lands whole at its load
  address at the hand-over (the table below). The game reloads nothing
  from disk during play: it is one load.
- **Hand-over or play?** The two differ in zero page, the stack, the
  variables at `$0210`-`$02E0`, some 150 operands and variables inside
  the code at `$7500`-`$B43C`, the loader's remains at `$CC00`-`$CFFF`
  (which play reuses as variables), 94 bytes of the character set at
  `$E7B8`-`$E842`, and the screens and sprite buffers from `$F29D` up.
  The hand-over holds the code as loaded, so it is the image to
  disassemble.
- **Emulator:** `release v3.14.0, v3.14.0-linux-x86_64-gui.zip`;
  `check-emulator` passed 57 of 57 on 13 November 2026, so no workaround
  applies.

## Where the disk's files land

Each file searched for in the hand-over and play snapshots in 16-byte
pieces (`10-orient`, step 7; `work/scripts/filemap.py`):

| File | Loads to | At the hand-over | In play |
|---|---|---|---|
| `PART4` | `$0400`-`$4000` | all 15,361 bytes equal | all 15,361 |
| `PART8` | `$4000`-`$67FF` | all 10,240 | all 10,240 |
| `PART5` | `$6800`-`$CBFF` | all 25,600 | 25,380 |
| `PART3` | `$2000`-`$2FFF`, copied to `$D000`-`$DFFF` | all 4,096, at `$D000` | all 4,096 |
| `PART7` | `$E000`-`$F5FF` | all 5,632 | 4,946 |
| `\` | `$C000`-`$C3FF`, copied to `$CC00`; its second half then to `$0200`-`$03FF` | 1,023 of 1,024 at `$CC00` | gone from `$CC00`; `$0200`-`$03FF` stays |
| `PART1` | `$C600`-`$CFFF` | overwritten by `PART5` and the loader's copy | |
| `PART2`, `PART6` | `$4000`-`$67FF` | overwritten by `PART8` | |
| `LOADER`, stage two | `$02A7`, `$F000` | overwritten | |

## The loader, in a paragraph

`LOADER` loads over the KERNAL's vectors and points the character-output
vector (`$0326`) at `$02B8`, so it runs as soon as `LOAD` prints. It
clears the screen to black, prints `RAMPAGE`, and loads stage two to
`$F000` with the KERNAL. Stage two copies itself to `$C000`, sends drive
code to the 1541, reads one byte back and compares it with `$C2`; a
mismatch jumps through `$FFFC` and resets the machine. On a match the
same `$C2` decrypts 256 bytes into `$1000`, which load the file `\` to
`$C000` and jump to it. That stage loads `PART1` and calls it (the
Activision screen), copies itself to `$CC00`, then loads the rest by
calling the KERNAL's load routine at `$F4A5` directly: `PART2` (shown as
a multicolour bitmap at `$4000`, colours from `$6400`), `PART3` (copied
to the RAM under the I/O area), `PART4`, `PART5`, `PART6` (the second
picture, shown the same way), `PART7` and `PART8`. Last it copies
`$CE00`-`$CFFF` to `$0200`-`$03FF` and jumps to `$8314`. Because the
later loads do not pass `$FFD5`, `kit/c64/loads.py` sees none of them.
