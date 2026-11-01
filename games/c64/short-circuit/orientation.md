# Short Circuit — orientation

How to get from the contributor's own copy to the analysed state.

## The image

`work/ge-image.g64`, 317,884 bytes. The header begins `GCR-1541`, so it is a G64: the raw GCR tracks of a 1541 disk, not a plain sector image. `python3 kit/c64/disk.py` reads it as 683 sectors, one of them with a bad checksum, and lists three programs:

| File | Loads at | Size | Role |
|---|---|---|---|
| (name of sixteen `$00` bytes) | `$0316` | 236 bytes | boot program: sets the KERNAL vectors and a hook on the character-output vector |
| `F` | `$4000` | 1,026 bytes | second stage: copies a 231-byte fast loader into the stack page and runs it |
| `SHORT` | `$0400` | 64,508 bytes | the game: both parts, the music and all the graphics, in one load |

No sector is in use that a file does not hold. The disk's name field holds a line of control characters and the text `"0:*",8,1`, which is not an original title, and the boot program and second stage look like a cracker's work. No trainer menu appears: the game starts with no choice offered.

**Version.** Nothing in the image names a release. The title screen says "(C) 1986 PSO / Ocean" on the picture and the end text says "COPYRIGHT OCEAN SOFTWARE MCMLXXXVII".

**Check emulator.** On release v3.14.0 (`v3.14.0-macos-arm64-gui.dmg`, macOS arm64) `check-emulator` passed 57 of 57 checks, so none of `workarounds.md` applies.

## From power-on to play

1. `python3 kit/scripts/tools.py vice`, then in a script `vice.reset(rpc, "hard")` and `vice.autostart(rpc, "games/c64/short-circuit/work/ge-image.g64")`. VICE loads the first file (`LOAD"*",8,1`) and runs it. The screen stays light blue with the border while the fast loader reads `SHORT`, about 50 seconds of emulated time at the autostart's warp speed.
2. The attract mode appears by itself: the credits screen (programming John Meegan, graphics Karen Davies, music Martin Galway), then a loading-style picture, then the high scores, over and over.
3. To start play, hold **fire on joystick port 2** for a second (or press **F1** for part one directly, **F3** for part two directly). Fire plays an intro (`PART ONE`, a short walk-on of the robot), after which part one is running about 8 seconds later. The clock reads `03:00`.
4. Snapshots in `work/`:
   - `entry.vsf`: the machine stopped on the first instruction of the game, `$9548`, after the loader's jump (a stopping checkpoint at `$9548` after a hard reset).
   - `play-part1.vsf`: part one in play, the clock at about 03:00:35, the robot in the first room with the prompt showing.
   - `play-part2.vsf`: part two in play, reached with **F3** on the attract screen and the stick held right for two seconds; the clock reads 06:00.

No joystick input is needed for the loader. The load needs no key press.

## The parts

The game is one load. Part one (the adventure, `$0400`-`$25EB` and `$2624`) and part two (the countryside run, `$2624`-`$3C00`) are both in memory from the start, and the same interrupt, sound and screen code serves both; nothing is loaded between them, and the code never calls the disk again after the load. So the game has no folder for parts.

## Steady state

The processor port is `$35` throughout (I/O visible, no ROMs). The VIC-II is in bank 3 (`$C000`-`$FFFF`, CIA2 port A = `$94`) for play; the attract mode switches banks to show the pictures. The IRQ vector at `$FFFE` is `$0738` in part one (a three-band raster chain: handlers at `$07A0` on line `$F3`, `$085E` on line 0 and `$0767` on line `$A3`), `$27A1` in part two, and `$3CDF` and `$98C0` in the attract mode. Part two also uses a CIA2 timer-A NMI (`$2956`) for scrolling.

Code lives in `$0400`-`$3D83` and `$8930`-`$8AEB` and `$9548`-`$ACA0`; the rest is data: text, tables, maps, tiles, the title picture, character sets, sprites and the music scripts (`facts.md`, "Memory layout").

## Memory mapped from the disk files

The three programs are loaded whole into memory by the loader and nothing is built from them, so every byte of `SHORT` is at its load address in the snapshot: 64,506 of its 64,506 bytes match `entry.vsf` from `$0400`. The first two files are the loader's own: the second stage (`F`, at `$4000`) is overwritten by the map data when `SHORT` loads.

## The loader, in a paragraph

The boot program restores the KERNAL vectors and replaces the character-output vector with a routine of its own, so that after `RUN` the first screen print loads `F` and jumps to it. `F` sends a command to the drive through its error channel, copies a small fast loader into the stack page (`$0100`-`$01E6`), asks the drive's status, picks the memory configuration from the first character it reads back (`$30` when it is `2`, otherwise `$37`), and jumps to it at `$0150`. The fast loader reads `SHORT` over the serial bus with its own protocol, taking each byte as four pairs of bits from `$DD00` and changing the border colour as it goes, and finally sets `$01` to `$35`, the video bank and the CIA interrupts, and jumps to `$9548`. After that no routine in the game talks to the disk again: an NMI path at `$2B25` ends in `JMP $0107`, a stack-page address inside the loader, and nothing found calls the loader after the start.
