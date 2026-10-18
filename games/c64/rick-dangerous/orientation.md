# Rick Dangerous — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Rick Dangerous (1989)(Firebird).tap`, 530,082 bytes, SHA-1
`c182d809631c2d183327564e6af74a9190abe9c1`. The header reads
`C64-TAPE-RAW`, version 1: a raw pulse recording of a cassette. It is the
Firebird cassette release: the loading screen reads "NOW LOADING ...
RICK DANGEROUS (C) 1989 CORE DESIGN LIMITED PUBLISHED BY FIREBIRD." No
intro, trainer or menu appears. The tape's blocks were not decoded, so
which block lands where is open.

## From power-on to play

1. Power-cycle the emulator (`reset(rpc, "hard")` in `kit/c64/vice.py`)
   and autostart the TAP with `autostart()`. VICE presses PLAY and types
   the load. Warp was found off once the load was typed; turn it on with
   `warp(rpc, True)`, or the tape plays at real speed (the first boot
   did, for several minutes). With warp on from eight seconds after the
   autostart, the game started 46 seconds later on 12 October 2026.
2. While the turbo part loads, the text above sits in the middle of the
   screen and the border flashes in stripes.
3. The game starts on the Hall of Fame (`reference/hall-of-fame.png`).
   Fire on control port 2 shows the title screen
   (`reference/title.png`), fire again the story screen "SOUTH AMERICA
   1945" (`reference/story-south-america.png`), and fire again starts
   play in the first room, Rick at the left (`reference/level1-start.png`).
   Each fire was held for half a second, with twenty seconds between them.
4. Snapshots in `work/`, all saved without ROMs:
   - `entry.vsf`: stopped on `$0810`, the game's first instruction, by an
     execute checkpoint on `$0800`-`$0FFF` armed once the loader's last
     stage had started (`work/handover.py` does it all, from power-on).
   - `title.vsf`, `title2.vsf`: the Hall of Fame and the title screen.
   - `play-level1.vsf`: twenty seconds after the fire that started play,
     Rick standing in the first room. The disassembler and the listing are
     built from this one.

The emulator was an own build of github.com/barryw/vice-mcp, release
v3.13.2, commit 1e83aab134, PAL, which passed all 57 of `check-emulator`'s
checks on 12 October 2026. None failed.

## Steady state

`$01` reads `$25` in play: RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`,
I/O at `$D000`. The start-up at `$0810` writes `$35` there. The game owns
the hardware vectors: NMI `$FFFA` = `$3A0C` (an `RTI`, so RESTORE does
nothing), RESET `$FFFC` = `$39ED` (a loop that flashes the border), IRQ
`$FFFE` = `$3A0D`, and `$0314` = `$3A0D` as well. CIA 2 selects video bank
3: the screens are at `$C000` and `$C400`.

The raster interrupt at `$3A0D` works down a list of raster lines through
the pointer at `$02`; each entry names the handler and the line of the
next interrupt (tables at `$3BD7`, `$3BE8`, `$3BF9`). One frame of play,
recorded with `kit/c64/frame.py capture` (`work/frame-play.json`), shows
`$D018` set to `$05` on line 66 and to `$0F` on line 265, and the
pointers of sprites 0 and 1 written on line 258 in both screens. The
interrupt vectors are not written during the frame.

The whole game is one load. All five story screens, the four levels' and
the ending's, are in memory at `$AD00`-`$B253` during level one, and the
C= cheat (`facts.md`) takes the game to level two's story screen with no
tape running. Comparing `entry.vsf` with `play-level1.vsf`, they differ
only in variables, zero page, the stack, the vectors, the screens at
`$0400` and `$C000`-`$C7FF`, and a few bytes at `$B56A`-`$B675` and
`$F82C`-`$F833`; no authored data is lost once play starts.

## The loader, in a paragraph

The KERNAL's own tape routine loads a turbo loader, which runs from the
RAM under the KERNAL (`$01` = `$05`, the IRQ vector at `$E1E2`), shows the
loading text and reads the rest of the tape. Its last stores to the
vectors come from code in zero page, after which it jumps to `$0810`. Not
annotated further, by policy.
