# Fat Worm Blows a Sparky — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`work/fat-worm-blows-a-sparky.tzx` — a 48K ZX Spectrum tape image, 49407
bytes, `ZXTape!` container made with Ramsoft MakeTZX (a producer text block
says so). It is the original Durell Software release (1986); no trainer, no
cracktro. The tape holds, in order:

| Block | What |
|---|---|
| text | `Created with Ramsoft MakeTZX` |
| header (Program) `FAT`, len 94 | the BASIC loader |
| data 96 bytes | the tokenised BASIC program |
| header (Code) `WORM`, len 190, start `$FAF2` | the turbo loader |
| data 192 bytes | the 190-byte turbo loader body |
| turbo data 49001 bytes | the whole game, loaded to `$4000` |

## From power-on to play

1. Start ZEsarUX (`python3 kit/scripts/tools.py --platform spectrum zesarux`)
   and `python3 kit/spectrum/zesarux.py smartload '{"path": ".../fat-worm-blows-a-sparky.tzx"}'`.
   The tape plays at real speed; the whole load is about two minutes.
2. The BASIC loader (`FAT`) runs first: `POKE 23624,0`, `POKE 23693,0`,
   `CLEAR 65535`, `LOAD "WORM" CODE`, `RANDOMIZE USR 64242` (`$FAF2`).
3. `$FAF2` is the game's own turbo loader: it reads the tape from the ULA
   port `$FE`, checksums the block, and writes 49001 bytes to `$4000`
   contiguously, overwriting itself as it passes (the loader's later half
   is re-written with the image's own bytes). It leaves a return address,
   `$EFD8`, on the stack and `RET`s there.
4. `$EFD8` is where the loader returns: two zero bytes (the listing carries
   no instruction there), then the hand-over stub proper at **`$EFDA`** -
   `di`, `SP=$F000`, clear the bitmap `$4000-$57FF`, fill the attributes
   `$5800-$5AFF` with `$0E`, set the border blue, then `JP $7C92`.
5. `$7C92` reads the byte at `$FC00`; if it is non-zero the game draws the
   anti-piracy forgery warning (text from the table at `$7CE0`) and waits for
   any key at `$7CA8`, which selects **all eight** keyboard half-rows
   (`XOR A` before `IN A,($FE)`), then goes to the menu at `$7F30`. Nothing
   writes `$FC00` - there is no store to it anywhere in the listing - so it
   is a byte of the loaded image rather than a flag the game clears; it reads
   `$FF` in both snapshots, so the warning is what the real boot shows.
6. `$7F30` copies a pre-rendered picture from `$F000` into the screen
   (`$F000-$F7FF` → `$5000-$57FF`, `$F800-$F8FF` → `$5A00-$5AFF`) and
   jumps to the menu handler at `$E508`.
7. The opening menu offers `1 REDEFINE KEYS`, `2 KEMPSTON JOYSTICK`,
   `0 START GAME`. Press `0` for the plain game (no trainers on this image,
   so no cheat choice to make).
8. Play begins: a smooth-scrolling perspective view of the circuit board,
   the worm at the centre, the insert map and counters in the HUD at the
   bottom of the screen (`SPARKIES`, `SPINDLES`, `MY-SCORE`, `HI-SCORE`).

## Snapshots taken

| File | State |
|---|---|
| `work/entry.sna` | at the forgery screen's wait loop (`$7CA8`, all eight half-rows selected), the turbo loader still in memory at `$FAF2` |
| `work/play-1.sna` | steady play, the worm on the board early in a game |

The two images differ in 10424 bytes. **The entry image is the one to
disassemble and to build the listing from**: at play the game has
overwritten the hand-over stub and the init/loader region (`$EFD8-$F000`,
`$F7DF-$FF41` and others) with its own variables, so the play snapshot
shows data where the entry snapshot still has code. `listing.py` is given
the play image as its second (`--entry`) image.

## Steady state

- **Interrupts are off.** The hand-over stub executes `DI` and the
  snapshot header records `IFF2=0`, `IM=1`; the game makes no reference to
  the ROM frame counter at `$5C78`, and the ROM's own IM1 handler at
  `$0038` only scans the keyboard and bumps `$5C78`. The game therefore
  runs its own timing with interrupts disabled; it never hooks the fixed
  48K interrupt vector.
- `$4000-$5AFF` is the screen (bitmap, attributes, printer buffer) and is
  reused: the game's pre-rendered pictures are copied through it, and its
  own variables sit above it.
- The game loads and runs as one image; nothing is reloaded from tape
  during play (a single turbo block, and the code makes no ROM `LOAD`
  calls during play).
- Which configuration is in force: a plain 48K machine, ROM paged in at
  `$0000-$3FFF`, the whole of RAM the game's from `$4000`. No 128K paging.

## The loader, in one paragraph

The BASIC program is a thin wrapper around a custom turbo loader. It loads
the 190-byte loader to `$FAF2` and calls it. That loader does its own
edge-timing off the ULA's `$FE` port, with a checksum test, and loads the
entire 49001-byte image to `$4000` at a speed well above the ROM's. It is
self-overwriting: the last part of the block lands on the loader's own
first half, which has already run. On success it returns, via a pushed
return address, to the game's entry stub at `$EFD8`. Per policy it is not
annotated byte by byte; the entry stub and everything from `$7C92` are.

## Where the code and data sit

- `$5B00-$62FF` - built at boot by `$EBF0-$EC59`: the 256-entry bit-reverse
  table at `$6200-$62FF` and the pre-shift pages below it. Not authored data.
- `$6300-$757E` - the board: the perspective curve at `$6300-$637F`, then the
  board's own records, which the walker at `$AF49` steps 7 bytes at a time.
- `$757F-$EBFF` - the game's code, interleaved with tables and variables.
- `$EC00-$EC6A` - the boot/init routine at `$EB9C` and its table generator.
- `$EC6B-$EFD9` - 817 zero bytes, then further zeros, the same in the
  hand-over and the play image; nothing reads them.
- `$EFDA-$EFFA` - the hand-over stub. It exists only in the hand-over image:
  in play the game has overwritten it with its own variables.
- `$F000-$FFFF` - data loaded from tape, which the halt screen's `$D37D`
  overwrites in full when the player presses `H`.
- `$FA67-$FF45` - the loader's region, a copy of a ROM routine, and the stack.

The exact split is the one committed in `symbols.json`: `work/layout.json`
seeds it, `work/merge.py` writes the control file, and
`kit/scripts/symbols_export.py --ctl` turns that back into `symbols.json`. The
trace (`work/tracer.py`, seeded at the entry, and the 2026-10-01 review's
successor `work/agents/a3_trace.py`) and the emulator's executed-address map
(`work/coverage_run.py`) are working files and are not committed. **The code
and data split was re-done on 3 October 2026**: a recursive trace from the
executed-address map found 5,934 bytes of reachable code still typed as data,
most of it sitting in the gaps *between* known code, including `$7790-$779C`,
whose `CALL $D05E` had hidden the whole halt screen from every earlier walk.
