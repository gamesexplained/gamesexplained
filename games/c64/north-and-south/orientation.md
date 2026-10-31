# North & South — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Four tape images from the Ultimate Tape Archive V4.0, entry 7562
(`North_&_South_(1991_Infogrames)_[7562]`), one for each cassette side:

| File | In `work/` | Side, as the game names it |
|---|---|---|
| `North_&_South_Tape_1_Side_1_-_Main.tap` | `main.tap` | tape 1 side 1 |
| `North_&_South_Tape_1_Side_2_-_Map.tap` | `map.tap` | tape 1 side 2 |
| `North_&_South_Tape_2_Side_1_-_Battle.tap` | `battle.tap` | tape 2 side 1 |
| `North_&_South_Tape_2_Side_2_-_Fort.tap` | `fort.tap` | tape 2 side 2 |

Each starts with the header `C64-TAPE-RAW`, version 1. The first loads
behind a striped border and the banner "CYBERLOAD NOW LOADING NORTH &
SOUTH": the Cyberload fast loader, a commercial one, with no cracker's
intro or trainer anywhere on the way to play. The run takes it for the
original release. The archive's folder also has the cover, the inlay,
pictures of the cassettes and the manual (`Instructions.pdf`, 27 scanned
pages in English, French and German), whose pages are in `work/manual/`.

## From power-on to play

1. Hard reset, autostart `work/main.tap` (`work/boot.py main.tap`), warp
   on. The KERNAL loads the Cyberload boot; the striped loading screen
   follows (about 40 seconds of warp in).
2. About 200 seconds of warp in, a picture with "HIT FIRE OR SPACE BAR TO
   CONTINUE". Fire on port 2: the loader goes on reading side 1.
3. About 30 seconds later, the menu (`work/menu.vsf`): the flags and the
   players, the year (1861), the three disasters, arcade or strategic,
   the joystick panel and GO. The menu's cursor is sprite 0, kept at
   `$101E`-`$1020` (x low, x high, y, in sprite coordinates); `work/cur.py
   <x> <y> menu` puts it there, and space clicks.
4. GO (sprite position 234, 203, then space): the loader reads on to
   "REWIND TAPE 1 SIDE 2, HIT FIRE THEN PLAY" (`work/ask-side2.vsf`).
   Attach `map.tap`, fire, press play: about 40 seconds of warp later the
   year's opening text (`work/map-intro.vsf`), and after space the
   strategic map (`work/map-1861.vsf`, January 1861, the menu's defaults:
   the Union played by a person, against the computer). The map's cursor
   is sprite 0 too, kept at `$0D41`-`$0D43` less 6 (`work/cur.py <x> <y>`).
5. In play the game's interrupts are its own, on the processor's vectors
   with the ROMs switched out: `$FFFE` (IRQ) and `$FFFA` (NMI) are
   `$82EE`/`$8183` on the title, `$15AA`/`$15A9` in the menu, `$10C6`/`$0FF9`
   on the map, `$8A2B`/`$884C` in the battle, `$83A8`/`$81BB` in the fort,
   `$8347`/`$81B8` on the train and `$8380`/`$8240` in the ending. `$0314`
   holds `$02A6` throughout, a hook the boot left, used while the KERNAL is
   in for the tape prompts.

## The parts

The game is one script, at `$0806`-`$0862` in the boot's code, that loads
files by number through `$0803` and calls what it loaded. Each file has a
two-letter name in the loader's table at `$0912`, and a tape and a side
at `$08F6` and `$08E8`; `$08CB` holds the number asked for, and `$0904`
says which files start a side, so that the loader shows "REWIND TAPE t
SIDE s, HIT FIRE THEN PLAY" first. The fourteen files:

| No. | Name | Tape, side | What it is | Part |
|---|---|---|---|---|
| 0 | OC | 1, 1 | the menu, with OM | menu |
| 1 | OM | 1, 1 | the menu, with OC | menu |
| 2 | M1 | 1, 2 | the strategic map | map |
| 3 | M2 | 1, 2 | the strategic map; the one reloaded after an arcade sequence | map |
| 4 | M3 | 1, 2 | the strategic map | map |
| 5 | S1 | 2, 2 | the fort | fort |
| 6 | S2 | 2, 2 | the train | train |
| 7 | TP | 1, 1 | the title picture | title |
| 8 | BS | 2, 1 | the battle | battle |
| 9-12 | T1-T4 | 1, 1 | the start year's situation, 1861 to 1864, by the menu's year (`$0389` + 9) | map (its text is copied out before M1-M3 load over it) |
| 13 | CS | 1, 2 | the ending, after M3 on the side | ending |

Each part's snapshots are in its own `work/`: `entry.vsf` (the hand-over,
the machine stopped on the part's first instruction) and `play.vsf`.
What each load writes was measured by filling memory with `$AA` and again
with `$EA`, loading, and keeping the bytes that came out the same
(`work/fillload.py`, `work/written.py`; `$D000`-`$DFFF` cannot be filled
that way, so it was read against the snapshot before the load). The end
of each file, one past its last byte, is also left by the loader in
`$AC`/`$AD`.

| Part | Over | Writes | Entry | Route |
|---|---|---|---|---|
| title | (the boot) | `$8000`-`$9FFF` and the boot's own code from `$0800` | `$8000`, called from `$080B` | power-on, autostart `main.tap`; `work/titleentry.py` stops on the `jsr $8000` whose return is `$080E` (about 184 seconds of warp). `title.vsf` is the picture with "HIT FIRE OR SPACE BAR TO CONTINUE" (about 210 seconds), the tape at 348,194 |
| menu | title | `$1000`-`$ABFF`, `$F632`-`$FFF9` | `$1000` | from `title.vsf` with `main.tap` at 348,194, fire; stop at `$1000` (`work/menuload.py`, 56 seconds). `menu.vsf` is the menu waiting, the tape at 689,592 |
| map | menu | `$0C00`-`$C4FF`, `$E000`-`$FFF9` | `$0C00` | from `menu.vsf` with `main.tap` at 689,592, the cursor on GO (`work/cur.py 234 203 menu`) and space: T1 loads and the prompt asks for tape 1 side 2 (`work/ask-side2-1861.vsf`); attach `map.tap`, fire, play; M2, M1 and M3 load (about 40 seconds), `$09EC` and `$09A9` run, and `$0C00` is the entry (`map-entry-1861.vsf`); then the strategic map of January 1861 (`map-play-1861.vsf`) |
| battle | map | `$3000`-`$CFFE` | `$8000`, from `$0CAB` | the computer playing both sides (the menu with 1864 and both flags clicked, `work/menu-1864-cc.vsf`) attacks at once: the prompt for tape 2 side 1 is `work/ask-battle.vsf`; attach `battle.tap`, fire, play (about 28 seconds) |
| fort | map | `$2000`-`$9FFF` | `$8000`, from `$0C8F` | the same game a minute later asks for tape 2 side 2 (`work/ask-2-2.vsf`), file 5; attach `fort.tap`, fire, play (about 21 seconds) |
| train | map | `$2000`-`$9FFF` | `$8000`, from `$0C9D` | no train came up in an hour of the computer playing both sides, so it was asked for: at the fort's prompt (`work/ask-2-2.vsf`) set `$08CB` to 6 before fire. The loader passes the fort's file, which ends at offset 263,443 of the side, and loads S2 (about 42 seconds); S2's code runs as it would from `$0C98` |
| ending | map | `$2800`-`$AF3F` | `$8000` | with the map's three files loaded (stopped at `$083E`, `work/at083E.vsf`), the PC set to `$0847`, past the script's `jsr $0C00`, and `$039B` set to 0 (it was `$94`): the script loads file 13 from the tape where M3 left it and calls `$8000` (`work/ending.py`, 23 seconds). Its picture shows for a few seconds; then the prompt for tape 1 side 1 |

The battle, fort and train hand-overs were taken in the 1864 game the
computer played; outside their own ranges memory holds that game's map.
The menu's year and players change only data: the map part's snapshots are
the menu's defaults (January 1861, the Union a person, the Confederacy
the computer).

## Steady state

`$01` is `$25` in every part in play: RAM everywhere but I/O at
`$D000`-`$DFFF`, no ROMs; the loader and the prompts switch the KERNAL in
(`$01` = `$17`) and out again. The game's own handlers are on `$FFFE`.
Code that every part keeps: the boot's script, the loader and the prompt
at `$0800`-`$0BFF`.

## The loader, in a paragraph

The tape starts with the KERNAL's own loading of a small boot, which
shows "CYBERLOAD NOW LOADING NORTH & SOUTH" on a striped border and reads
the rest with its own fast loader. The loader (`$0A63`) takes the file's
two-letter name in `$BB`/`$BC`, reads blocks on a CIA timer interrupt
(`$0ACB`) with the border flashing, compares each header's name with the
one asked for and skips files that are not it, and passes raster
interrupts on through `($03FE)`. Its code also holds the text "HACKERS,
FUCK OFF AND DIE..." at `$F2CC` in the menu's memory. Some code inside a
file's range runs while that file loads: a fill of `$55` (a two-byte
instruction) under the battle stopped the load where `$AA` and `$EA`
(one-byte instructions) did not; which code, nobody has looked yet.
