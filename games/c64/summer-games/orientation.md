# Summer Games — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Three G64 images were supplied, named `summer_games[epyx_1984](pal)(!).g64`,
`summer_games[epyx_1984](ntsc)(!).g64` and
`summer_games[epyx_1984](pal)(alt).g64`. The headers say what the names
say: GCR images (`GCR-1541`), of 40, 36 and 35 tracks. The PAL image is the
one analysed, kept as `work/summer-games-pal.g64`.

The directory, the same on all three apart from order and one file:

| File | Blocks | Loads at | What it is |
|---|---|---|---|
| `SUMMER GAMES` | 1 | `$02A7` | boot: overwrites the BASIC vectors so it runs as it loads, loads `SGLOAD` |
| `LOADER` | 4 | — | not a file: three sectors from track 23, then a chain that leaves the disk (protection) |
| `SGLOAD` | 5 | `$0801` | the PAL images' loader (absent from the NTSC image): copies itself to `$C000` and loads the game |
| `A` | 40 | `$8000` | the opening ceremony and menus' graphics, packed |
| `B` | 42 | `$4000` | the engine, packed: unpacks to `$0C00`-`$3EFF` |
| `D` `E` `F` `H` `I` `K` | 79 38 38 91 84 39 | various | one event module each, packed (the parts below) |
| `L`, `M` | 5, 5 | `$4000` | small packed modules (see `media.json`) |
| `WR`, `DEFAULT` | 1, 1 | `$0B00` | the world records, saved by the game, and the factory set |

The two PAL images agree on every file; the NTSC image has no `SGLOAD`
and boots through `LOADER` instead. The emulator's checks (VICE v4.0.0
release, `v4.0.0-linux-x86_64-gui.zip`) failed `checkpoints-survive-load`
and `snapshot-ram-offset`; the second is the RAM moving from offset 209
to 232 in v4.0.0's snapshots, which `kit/c64/snapshot.py` on this branch
reads.

## From power-on to play

1. Hard reset, attach `summer-games-pal.g64` as drive 8 and autostart it
   (`vice.py` `autostart`). The disk loads for about 40 seconds of
   emulated time, then the Epyx title and credits appear.
2. The opening ceremony follows: a runner carries the torch up the steps,
   the flame is lit and doves fly. Then the main menu, about 90 seconds
   after power-on. Keys pressed before the menu are ignored.
3. On the main menu press `3` (Practice one event), then `1` to `8` for
   the event. The module loads through the KERNAL (about a minute at
   normal speed, seconds in warp).
4. Snapshots: `parts/resident/work/entry.vsf` is the hand-over, taken at a
   stopping checkpoint on `$7600` after a hard reset and autostart; each
   event's `entry.vsf` is taken at a stopping checkpoint on that module's
   entry (table below), and `play.vsf` twelve seconds later.

The joystick for one player is in port 1; with "Number of joysticks: 2"
the second player uses port 2. Keys held through the matrix can block
the next input: `release_all()` before each one.

## The parts

The game is an engine in memory all the time and one module at a time
above it. Every module goes through the same loader at `$0934`: it loads
the file named by the letter at `$0AF3,x` through the KERNAL, then unpacks
it with a run-length scheme (`$BF n`: n zeros; `$CF n v`: n copies of v;
anything else: itself) from its load address to the destination, and
jumps to the entry. The tables at `$0A8D`-`$0AE2` give each module's
packed source, destination, end and entry:

| x | File | Part | Packed at | Unpacked to | Entry |
|---|---|---|---|---|---|
| 0 | A | front (ceremony, menus) | `$8000` | `$4000`-`$7F99` | `$7600` |
| 1 | B | resident (the engine) | `$4000` | `$0C00`-`$3EFF` | `$0C00` |
| 2 | C | — | `$E000` | `$E000`-`$E00F` | `$E000` |
| 3 | D | pole-vault | `$8200` | `$4000`-`$CAFF` | `$6FE0` |
| 4 | E | diving | `$8300` | `$5800`-`$BBFF` | `$7FE0` |
| 5 | F | running (relay) | `$8000` | `$4000`-`$7FEF` | `$5700` |
| 6 | F | running (dash) | `$8000` | `$4000`-`$7FEF` | `$6D75` |
| 7 | H | gymnastics | `$6580` | `$4000`-`$BF11` | `$4000` |
| 8 | I | swimming (freestyle relay) | `$6D40` | `$1000`-`$BEFF` | `$17D0` |
| 9 | I | swimming (100 m freestyle) | `$6D40` | `$1000`-`$BEFF` | `$17D3` |
| 10 | K | skeet | `$8000` | `$4000`-`$7CEF` | `$7000` |
| 11 | L | — | `$4000` | `$C400`-`$CC07` | `$E000` |

Route to each event part: from the main menu, `3` and the event's number
(1 pole vault, 2 diving, 3 relay, 4 dash, 5 gymnastics, 6 freestyle relay,
7 100 m freestyle, 8 skeet). Swimming unpacks over the engine
(`$1000`-`$3EFF`), so the engine is loaded again afterwards.

## Steady state

The NMI vector at `$0318` points at `$0906` (RESTORE with RUN/STOP
restarts at `$09DC`). The engine's menus run on the KERNAL's interrupt
(`$0314` = `$EA31`); pole vault installs `$BC54` and skeet `$707A`;
swimming banks the KERNAL out and sets the hardware vectors itself
(`$FFFE` = `$E519`).

## The loader, in a paragraph

`SUMMER GAMES` loads `SGLOAD`, which copies a fast loader to `$C000`
and the engine's own loader stub to `$0900`-`$0BFF`. The engine and the
front end then arrive through that stub like every other module: the
first byte of `$1000` is written by its unpacker at `$09CC` about 38
seconds after the autostart, and the front end is entered at `$7600`
with `$087E` holding `A`. Later modules load through the KERNAL by name. A copy-protection
check at `$3AEA` asks the drive to read track 35, sector 1 and expects
error 29.
