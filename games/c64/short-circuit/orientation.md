# Short Circuit — orientation

How to get from the contributor's own copy to the analysed state.

## The image

`work/Short_Circuit.tap`, 643,155 bytes, SHA-256 `6b51138710fa6bf6b8842b6520d9e43412caad4f335f8eb8afe85e46535ed1f2`: a TAP of the original Ocean cassette, entry 1755 of the Ultimate Tape Archive V4.0, with scans of the inlay and the cassette. `python3 kit/c64/tap.py work/Short_Circuit.tap` reads it from the pulses:

| Item | Loads at | Size | Role |
|---|---|---|---|
| `SHORT CIRCUIT`, in the KERNAL's format | `$0316` | 701 bytes | the boot program: Ocean's turbo loader |
| turbo block 1 | `$0100` | 512 bytes | the loader's own code again, and fill |
| turbo block 2 | `$A000` | 4,096 bytes | the loading tune |
| turbo blocks 3 to 8 | `$5C00`, `$8500`, `$6000`, `$0400`, `$8000`, `$B000` | 61,696 bytes | the loading picture's colours and bitmap first, then the rest of memory up to `$FFFF` |
| turbo block 9 | `$A000` | 4,096 bytes | the game's music driver, loaded over the loading tune |

`media.json` answers each one. From `$0334` to `$FFF9` the memory the loader leaves is byte for byte the memory a cracked disk version (a G64, analysed first) handed to its game: the game is the same program, and the listing was built again from the tape (`work/entry.vsf`). The two differ only in the zero page and `$0200`-`$0333`, which the tape loader clears and the disk version did not, and in the vectors at `$FFFA` and `$FFFE`, which the tape loader rewrites after every byte it stores.

**Version.** Nothing on the tape names a release. The title picture says "(C) 1986 PSO / Ocean" and the end text says "COPYRIGHT OCEAN SOFTWARE MCMLXXXVII".

**Emulator.** VICE release v3.13.2 (vice-mcp commit `1e83aab134`) under WSL Ubuntu on Windows 11.

## From power-on to play

1. `python3 kit/scripts/tools.py vice`, then in a script `vice.reset(rpc, "hard")`, `vice.autostart(rpc, "games/c64/short-circuit/work/Short_Circuit.tap")` and `vice.warp(rpc, True)` (`work/handover.py` does it). The KERNAL loads `SHORT CIRCUIT` and runs it. The loading picture fills in from the top while the loading tune plays; with warp on, the game starts 265 seconds after the autostart.
2. The attract mode appears by itself: the credits screen (programming John Meegan, graphics Karen Davies, music Martin Galway), then the title picture, then the high scores, over and over.
3. To start play, hold **fire on joystick port 2** for a second (or press **F1** for part one directly, **F3** for part two directly). Fire plays an intro (`PART ONE`, a short walk-on of the robot), after which part one is running. The clock reads `03:00`.
4. Snapshots in `work/`:
   - `entry.vsf` (a copy of `sc-entry.vsf`): the machine stopped on the first instruction of the game, `$9548`, by a stopping checkpoint there from the autostart on.
   - `play-part1.vsf`: part one in play, 15 seconds after fire on the attract screen, Johnny in the first room (`work/play.py part1`).
   - `play-part2.vsf`: part two in play, reached with **F3** on the attract screen and the stick held right for two seconds; the clock reads 06:00 (`work/play.py part2`).

The load needs no key press and no joystick.

## The parts

The game is one load. Part one (the adventure, `$0400`-`$25EB`) and part two (the countryside run, `$2624`-`$3C00`) are both in memory from the start, and the same interrupt, sound and screen code serves both; nothing is loaded between them, and the code never reads the tape again after the load. So the game has no folder for parts.

## Steady state

The processor port is `$35` throughout (I/O visible, no ROMs). The VIC-II is in bank 3 (`$C000`-`$FFFF`, CIA2 port A = `$94`) for play; the attract mode switches banks to show the pictures. The IRQ vector at `$FFFE` is `$0738` in part one (a three-band raster chain: handlers at `$07A0` on line `$F3`, `$085E` on line 0 and `$0767` on line `$A3`), `$27A1` in part two, and `$3CDF` and `$98C0` in the attract mode. Part two also uses a CIA2 timer-A NMI (`$2956`) for scrolling.

Code lives in `$0400`-`$3D83` and `$8930`-`$8AEB` and `$9548`-`$ACA0`; the rest is data: text, tables, maps, tiles, the title picture, character sets, sprites and the music scripts (`facts.md`, "Memory layout").

## The loader, in a paragraph

The boot program blanks the screen and copies 512 bytes of itself to `$0029`-`$0228`, where the loader runs. Each pulse from the tape raises an IRQ through CIA 1's FLAG line, the cassette's read line; its handler at `$008B` starts CIA 2's timer A, which 16 cycles later raises an NMI. The NMI handler at `$0098` reads the high byte of CIA 2's timer B, which it then restarts from `$03E0`, so a pulse of 480 cycles or more reads as a 1 (the tape's two pulses are 280 and 648 cycles), and shifts the bit into `$02` from the top, the lowest bit first. A long run of 0 bits and then a 1 start the bytes; from there the tape is pages, each a flag byte, a page number and 256 bytes, until a page numbered 0 ends the load (`kit/c64/tap.py`, the row "pages after a 1 bit"). The flags steer the loader's main loop, which runs once a frame: bit 0 clear stores the page with all RAM banked in (`$01` = 0), bit 1 starts the loading tune at `$AD05` and calls `$AD14` each frame after, which silences the tune at the first page without the bit (`$ACFB`), before the game's own `$A000`-`$AFFF` reaches it, and bit 5 turns on the multicolour bitmap and copies its colours from `$8548` to colour RAM. Without bit 1 the border flashes with the incoming bits. The pages come in this order: the loader's own two pages, the loading tune at `$A000`, the picture's screen colours (`$5C00`) and colour data (`$8500`), its bitmap (`$6000`), then `$0400`-`$5BFF`, `$8000`-`$9FFF`, `$B000`-`$FFFF`, and last the game's own `$A000`-`$AFFF` over the tune. After page 0 the loader stops the CIAs, clears the zero page, `$0200` and `$0300`, checks for a cartridge at `$8000` and jumps to `$0000`; how control gets from there to `$9548`, where a checkpoint first meets the game, was not traced.
