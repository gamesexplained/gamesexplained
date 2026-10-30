# Speedball 2 — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

The analysed image is Mirrorsoft's 1991 disk release (published under its
Imageworks label), from the C64 Preservation Project's collection of G64
images on the Internet Archive
(`C64_Preservation_Project_10th_Anniversary_Collection_G64.zip`, entry
`s/speedball_2[mirrorsoft_1991].zip`). The collection has two more dumps,
`(alt1)` and `(alt2)`; this run used the one with no flag.

| File | Header | Bytes | SHA-256 |
|---|---|---|---|
| `speedball_2[mirrorsoft_1991].g64`, copied to `work/speedball2.g64` | `GCR-1541`, version 0, 84 half-tracks, longest track 7,928 bytes | 373,394 | `c379e7c152123a9565e54b5e6714792f4e518eeb5d8803cdd17bc88845ab4dc4` |

`kit/c64/disk.py` read 664 sectors with no bad checksum. The disk is named
`SPEEDBALL II`, id `TO`, and lists four files:

| File | Loads at | Bytes | What it is |
|---|---|---|---|
| `BOOT` | `$0316`-`$03FD` | 230 | the boot loader, over the KERNAL's vectors |
| `PART0` | `$0812`-`$6A3C` | 25,131 | the intro, encrypted and packed three times over |
| `SPDBALL` | `$0812`-`$CA39` | 49,704 | the game, encrypted and packed twice over |
| `SAVESPEED` | `$CC00`-`$CD60` | 353 | a saved league or cup, in the game's own save format (not loaded at boot) |

Track 1 has no sector 0 that the drive can read; its sectors 18 to 20 are
marked used in the BAM and hold nothing but `$01` bytes. Track 1 sector 0
is the copy protection (below).

Every file but `SAVESPEED` is packed or encrypted, so none of them is
found in memory in 16-byte pieces: the search of step 7 of `10-orient`
places nothing. What each one becomes is traced instead, under "The
loader".

No trainer, cracktro or menu stands in front of the game: the image is
the original.

## From power-on to play

1. Power-cycle (`reset(rpc, "hard")` in `kit/c64/vice.py`) and autostart
   `work/speedball2.g64`. VICE's defaults run the drive's own processor;
   no `vicerc` was needed.
2. `BOOT` loads and starts itself; the KERNAL then loads `PART0` at
   normal speed. The intro's first instruction, `$C800`, ran 70 seconds
   after the autostart call (VICE v3.14.0, PAL, 30 October 2026).
3. The intro shows the `SPEEDBALL 2` logo, then the stadium picture and
   a scrolling story, and loops until fire is pressed on joystick port 2.
   Fire starts the load of `SPDBALL`, at normal speed again, behind
   coloured stripes in the border; the game's first instruction, `$C000`,
   ran 130 seconds after fire.
4. The game shows the `SPEEDBALL 2` and Imageworks title and waits for
   fire on port 2. Fire gives the menu (`1 PLAYER GAME`, `2 PLAYER GAME`,
   `DEMO`). Fire on `1 PLAYER GAME`, fire on `KNOCKOUT`, fire on the
   `NEXT FIXTURE` screen, then fire on `ESC` in the gym starts a match.

The snapshots, all saved without ROMs:

| Snapshot | Part | When |
|---|---|---|
| `parts/intro/work/entry.vsf` | intro | the hand-over: stopped on `$C800`, the intro's first instruction |
| `parts/intro/work/play.vsf` | intro | the intro running, about two minutes in |
| `parts/game/work/entry.vsf` | game | the hand-over: stopped on `$C000`, the game's first instruction |
| `parts/game/work/menu.vsf` | game | the `1 PLAYER GAME` menu |
| `parts/game/work/gym.vsf` | game | the gym, before the first knockout match |
| `parts/game/work/play.vsf` | game | a knockout match, a few seconds in |
| `parts/game/work/match1.vsf` | game | the next match, at kick-off, after `ALL` was bought in the gym |
| `parts/game/work/manager.vsf` | game | the manager screen of a new league |

To reach a hand-over: put a stopping checkpoint on `$0812` before the
load, let it stop (the loaded file's first instruction), then on `$025D`
(the first unpacker's last instruction), then on `$0812` again (the
second unpacker), then on `$0834` (past its own start), and then on the
entry: `$C800` for the intro, `$C000` for the game. The intro passes
through one more round of the second unpacker than the game, so for the
intro the `$0812`, `$0834` pair comes twice before `$C800`.

## The parts

The intro and the game are two loads, each the whole of memory
(`kit/skills/core/15-parts`):

| Part | Files | Route |
|---|---|---|
| `intro` | `BOOT`, `PART0` | from power-on, as above |
| `game` | `SPDBALL` | from the intro, fire on port 2 |

Neither part names the other in `over`: each replaces the program before
it. Both unpack to `$0200`-`$DFFF`, the whole span, and nothing else (the
unpacker's output pointer runs on without a gap and ends at `$E000` in
both). `$E000`-`$FFFF` at each hand-over holds the last 8 KB of the packed
stream the unpacker has just read, which nothing in either program reads.

The game keeps four short routines packed inside itself (at `$534F`,
`$5434`, `$559E` and `$764D`, each straight after a `JSR $0FC7`) and
unpacks each to `$C000` when it is called, then runs it there. They are
not loads the player waits for, and they overlap each other at `$C000`,
so they are not parts: each is described where it is packed, in the game
part's listing.

## Steady state

- **The game, menus and screens.** `$01` = `$35` (I/O in, both ROMs out).
  The interrupt vectors are the hardware ones in RAM: IRQ `$FFFE` =
  `$4B87`, NMI `$FFFA` = `$4B8B`. The video bank is 3 (`$C000`-`$FFFF`,
  `$DD00` = `$C4`); the title is a multicolour bitmap at `$E000` with its
  screen matrix at `$CC00` (`$D018` = `$39`).
- **The game, in a match.** IRQ `$FFFE` = `$126B`, a sprite multiplexer:
  it takes the next raster line from a table at `$0140` and the next
  sprite from a sorted list at `$0100`, and writes `$D012` itself. A
  recorded frame (`kit/c64/frame.py capture`) has two splits: at line 36
  the pitch, `$D018` = `$DE` (screen `$F400`, characters `$F800`), and
  at line 221 the score panel, `$D018` = `$CC` (screen `$F000`,
  characters `$D800`).
- **What moves.** Across the menu, gym and match snapshots, nothing from
  `$0C00` to `$BBFF` changes except page `$7A` (in a match) and a few
  bytes at `$0C`, `$1D`: the program is resident there. The pages that
  change are zero page and the stack, `$0800`-`$0BFF` (the game's
  variables), `$BC00`-`$BFFF`, and the whole of `$C000`-`$FFFF`, where
  each screen unpacks its own pictures, characters and sprites, and the
  four packed routines run.
- **The intro.** Code at `$C800` upward; between its hand-over and play,
  only zero page, the stack, pages `$06`, `$0E`, `$10`-`$1E` (every other
  page: the sprites), `$B7`-`$BF`, `$C8`, `$CB`-`$CF` and `$E000`-`$FFFF`
  change.

Nothing more is read from the disk once the game runs, except a saved
league or cup: `S0:SAVESPEED` at `$79F3` scratches and saves the file, and
the game's loader reads it back, through the KERNAL's `LOAD` and `SAVE`
with the KERNAL banked in.

## The loader, in a paragraph

`BOOT` loads over the KERNAL's vectors from `$0316`, and points `CHROUT`
(`$0326`) at `$0362`, so the KERNAL's first `READY.` after the load runs
it. It opens the drive's command channel and asks for a block read of
track 1 sector 0 (`U1 2 0 01 00`), reads the first two characters of the
drive's reply, adds them, and decrypts `$0394`-`$03FC` with the sum as an
XOR key. On the original the sector cannot be read, the drive answers
`21` (no sync mark), and the key is `$63`; any other answer gives code
that crashes. The decrypted code puts the vectors back, blanks the
screen, loads `PART0` with the KERNAL, stores the key at `$0100`, and
jumps to `$0812`. There the file's first instruction calls `$CA00`, which
decrypts the next layer with the key at `$0100`; then two unpackers of
one format run in turn (the first from `$0200`, the second copied into
zero page at `$000E`), each moving its packed data to the top of memory
and writing forwards from its destination. The intro is unpacked three
times and the game twice; the last pass writes `$0200`-`$DFFF` and jumps
through `$000A` to the entry. The intro loads `SPDBALL` when fire is
pressed and starts it the same way. `$03CC`-`$03DB` in the decrypted
boot is a second route nothing calls, which loads four files and jumps to
`$0900`. The `BASIC` line the intro's middle layer holds at `$0801` reads
`10 SYS2066 CARL`. Not annotated further, by policy.
