# Space Rogue — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two G64 files, one per side of the original 1989 Origin Systems disk,
from the C64 Preservation Project's 10th anniversary collection on
archive.org (`C64_Preservation_Project_10th_Anniversary_Collection_G64.zip`,
entries `s/space_rogue_s1[origin_1989](!).zip` and
`s/space_rogue_s2[origin_1989](!).zip`). The `(!)` marks a verified good
dump. Each zip holds one 286,164-byte file:

| File | SHA-256 |
|---|---|
| `space_rogue_s1[origin_1989](!).g64` (saved as `work/side1.g64`) | `f8f4bdd5ef11d1be706171a6f1dd34016d3329dda9ac790965d422532039bcea` |
| `space_rogue_s2[origin_1989](!).g64` (saved as `work/side2.g64`) | `944b0898c97aa41d781c50877d78ab6a58842bb843c0d9c10a30d7bf5680c694` |

The header reads `GCR-1541`: a GCR image of the original, 42 tracks
(c1541 says so on attach). Every file on both sides is an ordinary
KERNAL file, and the game loads all of them through the KERNAL: there is
no fast loader and no disk protection in the code that runs. The intro
carries a list of words from the manual for a look-up check (`facts.md`
says when it is asked).

Side 1, "space rogue boot": `boot`, `space`, `rogue`, `title`, `ship`,
`credits`, `intro`, `font`, `i1.pac`, `i2.pac`, `i3.pac`, `sr`, `init`,
`main`, `extern`, `spb`, `won`, `f1.pac`, `f2.pac`, `f3.pac`, `saved`
(254 blocks free). Side 2, "space rogue data": `data`, `seg0`, `seg1`,
`seg1a`, `hcode`, `end`, `pit.pac`, `nav.pac`, `land.pac`, `h.pac`,
`nav.til`, `land.til`, `h.til`, `talk`, `h.map`, `q0`-`q7`, `q9`, twelve
base maps `l00`-`l70`, and fourteen ship and base models (`car`, `fre`,
`gat`, `hun`, `icr`, `mcr`, `msc`, `out`, `pcr`, `pla`, `psc`, `sco`,
`sta`, `tit`), 23 blocks free. Every file's own load address is `$2000`
(`h.til`, `land.til` and `nav.til` say `$4000`, `saved` `$0403`); the
game ignores them and names the destination of every load itself.

## Emulator check

`tools.py --platform c64 check-emulator` on VICE v3.13.2 (vice-mcp build
`v3.13.2-linux-x86_64-gui.zip`), 14 October 2026: 57 of 57 checks passed,
none failed.

## From power-on to play

1. Hard reset, then autostart `work/side1.g64` (VICE turns warp on for the
   autostart; turn it off).
2. `boot` is a BASIC program: it pokes 40 bytes to `$C000` and
   `SYS 49152`. They load `TITLE` to `$2000` and jump there
   (`work/intro-entry.vsf`, copied to `parts/title/work/entry.vsf`, is
   the stop on `$2000`).
3. The title loads its pictures and `SHIP`, the animation's shapes, and
   plays, over and over: the Sunracer lifts off from a planet under a star
   field and climbs away with the Space Rogue logo behind it, then the
   credits page with the Origin logo. Any key puts up the credits, loads
   `INTRO` to `$6800` and jumps there (`parts/intro/work/entry.vsf`);
   `INTRO` asks "Old or New Game?".
4. **On a PAL machine the prompt can hang** (two clean boots out of two):
   the interrupt stops and the screen freezes. It is the game's own bug:
   `bitmap_mode` writes `$D011` back with the beam's current line bit 8,
   which lands in the raster compare (`features.md`). To go on, with the machine paused, set `$01` to
   `$35`, clear bit 7 of `$D011`, put `$01` back and resume
   (`work/scripts/sr.py`, `unstall`). The same hang recurs in play; the
   same fix clears it every time.
5. `N`, then a name (`PILOT`) and Return. Space pages through the story
   (`parts/intro/work/story.vsf`).
6. The intro loads `SR` to `$0400` and jumps there
   (`parts/engine/work/entry.vsf`). The engine asks for side 2 ("Insert
   DATA disk"): attach `work/side2.g64` and press Space.
7. The game starts aboard the derelict *Princeton* in the walk-around
   view. Walk to the ship's hatch to launch; the engine loads `SEG0`
   (`parts/flight/work/entry.vsf`, the stop on `$65B0` after it).
8. In the cockpit (`parts/engine/work/play-flight.vsf` and
   `parts/flight/work/play-flight.vsf`): `N` for navigation, chart to
   Hiathra Starbase at 13,19, HELM, then `C` for the cockpit
   (`parts/flight/work/nav.vsf` is the arrival).

## The parts

The engine stays in memory from step 6 on. Flight and the bases are each
loaded over part of it, Hive! over part of a base, and the ending replaces
part of it. The title, the intro and the ending are programs of their own
that leave the rest of memory as it was.

| Part | Loads | Snapshots (`parts/<id>/work/`) | Route |
|---|---|---|---|
| title | `TITLE` $2000, `SPACE` $B700, `ROGUE` $AC00, `SHIP` $6800, `CREDITS` $3000 | `entry.vsf` (stop on $2000), `prompt.vsf` (the lift-off, the ship climbing over the logo) | steps 1-3 |
| intro | `INTRO` $6800, `FONT` $F200, `SPACE` $B700, `I1.PAC` $8400, `I2.PAC` $9200, `I3.PAC` $A100 | `entry.vsf` (stop on $6800), `story.vsf` (the first page) | steps 3-5 |
| engine | `SR` $0400, then `INIT` $E900, `MAIN` $6400, `EXTERN` $EB00, `SPB` $BD00, `FONT` $F200 | `entry.vsf` (stop on $0400), `play-flight.vsf` | step 6 |
| flight, over engine | `SEG0` $A500, `END` $E900, a model at $E400 per object met (`STA`, `HUN`, ...), `PIT.PAC` $4000, and in navigation `NAV.PAC` and `NAV.TIL` $4000 and the system's `Qn` $5100 | `entry.vsf`, `play-flight.vsf`, `nav.vsf`, `approach.vsf` | step 7 |
| station, over engine | `SEG1` $A500, `SEG1A` $E400, `LAND.PAC` $4000, the base's `Lnn` $5100, `TALK` $5700, `LAND.TIL` $4000 | `entry.vsf` (the docking message), `walk.vsf` (the hangar at Hiathra) | below |
| hive, over station | `HCODE` $5700, `H.PAC` $4000, `H.TIL` $4000, `H.MAP` $5100 | `entry.vsf` (the cabinet's menu), `play.vsf` (combat drop 1) | below |
| ending | `WON` $6800, then `F1.PAC` $8400, `F2.PAC` $9200, `F3.PAC` $A100 | `entry.vsf` (stop on $6800), `play.vsf` (the second page) | below |

**Station.** The run did not fly the docking: it called the game's own
docking routine. From `parts/flight/work/approach.vsf` (Hiathra in sight,
1,537 m), a stopping checkpoint on `$3102` (the top of the flight loop),
then PC = `$7094`, the routine the collision handler at `$7033` jumps to
when the nose touches the docking face at under 21 m/s. It loads the five
files and prints "Docking privileges at Hiathra granted"; a key gives the
hangar (`work/scripts/forcedock.py`).

**Hive!** From `walk.vsf`, a stopping checkpoint on `$A674` (a routine the
base's loop calls), then PC = `$AAD6`, the handler the base's tile-action
table at `$AB30` gives for a Hive! cabinet. It loads `HCODE` over `TALK` and
calls it; "Insert credit", then a key, gives combat drop 1
(`work/scripts/forcehive.py`). The handler reloads `TALK` and `LAND.TIL`
when the game ends.

**Ending.** From `approach.vsf`, the same stop on `$3102`, `$071D` (the
current system, whose map is the file `Q` and that digit) set to 9, the
Manchi system, and PC = `$7094`: the docking routine sees system 9 and jumps
to `$1532`, which loads `WON` from side
1 ("Insert BOOT disk..."; attach `work/side1.g64`, press Space) and jumps to
`$6800` (`work/scripts/wonentry.py`). `WON` loads its three pictures
through the KERNAL itself.

## Steady state

In play the processor port is `$34`, all RAM, with the I/O banked in only
around the code that touches the chips. The interrupt vectors at
`$FFFA`/`$FFFC`/`$FFFE` are `$0E9E`, `$0E9F` and `$0EA0`, all in `SR`; the
KERNAL's `$0314` vector holds `$0EA5`, used while the KERNAL is banked in
to load. The screen is a multicolour bitmap in the VIC's last bank
(`$DD00` = `$C4`): bitmap `$C000`-`$DF3F`, under the I/O area, screen
matrix `$E000`, under the KERNAL. The title runs in bank 1 (`$DD00` =
`$C6`, bitmap `$4000`, screen `$6000`).

Resident from step 6: `SR` `$0400`-`$3FFF` (the loader, the interrupt,
the game state from `$0403`, which `SAVED` holds), `MAIN` `$6400`-`$A4FF`,
`SPB` `$BD00`-`$BEFF`, `EXTERN` `$EB00`-`$F1FF`, `FONT` `$F200`-`$F5FF`.
Overlays: `$A500`-`$BCFF` (`SEG0` or `SEG1`), `$E400`-`$EAFF` (models and
`INIT`/`END` in flight, `SEG1A` at a base), `$4000`-`$50FF` (a packed
picture, then a tile set), `$5100`-`$56FF` (a system's sector map, a
base's map or the Hive! map), `$5700`-`$61FF` (`TALK` or `HCODE`).

`END` is `INIT` under another name: the same 512 bytes. The engine runs
`INIT` once at start; `SEG1A` writes over it at every base, and leaving a
base loads `END` to put the same bytes back.

## The loader, in a paragraph

There is no fast loader. `SR`'s `$1765` takes a file name in X/Y (each
name is a zero-terminated string in the table at `$07BC`, from `TITLE` to `TALK`) and a
destination in `$80`/`$81`, swaps the KERNAL's zero page (`$90`-`$C4`)
with a copy at `$0100`, banks the KERNAL in, and calls SETLFS 1,8,0,
SETNAM and LOAD with secondary address 0, so the destination is the
game's choice. A load that fails prints "Insert BOOT disk..." or "Insert
DATA disk..." and tries again. `$1783` saves the same way (`@0:SAVED`,
`$0403`-`$0801`). The title, the intro and the ending each carry their own
copy of a smaller loader called with the destination and name inline after
the `JSR`.

## Files and where they land

Found by searching the snapshots for each file in 16-byte pieces
(`work/scripts/mapfiles.py`); "equal" counts the file's bytes found
unchanged in that snapshot.

| File | Bytes | At | Part | Equal |
|---|---|---|---|---|
| boot | 219 | $0801-$08DB (BASIC) | title | 219 |
| title | 4,096 | $2000-$2FFF | title | 4,096 at the entry |
| credits | 4,096 | $3000-$3FFF | title | 4,096 |
| ship | 16,640 | $6800-$A8FF | title | 16,640 |
| rogue | 2,816 | $AC00-$B6FF | title | 2,816 |
| space | 2,304 | $B700-$BFFF | title, intro | 2,304 |
| intro | 6,912 | $6800-$82FF | intro | 6,876 |
| i1.pac, i2.pac, i3.pac | 2,816, 2,816, 3,840 | $8400, $9200, $A100 | intro | whole |
| font | 1,024 | $F200-$F5FF | intro, engine | 1,024 |
| sr | 15,360 | $0400-$3FFF | engine | 15,360 at the entry |
| saved | 1,023 | $0403-$0801 | engine (game state) | |
| init, end | 512 each, the same bytes | $E900-$EAFF | engine start, flight | 512 |
| main | 16,640 | $6400-$A4FF | engine | 16,610 in flight |
| extern | 1,792 | $EB00-$F1FF | engine | 1,792 |
| spb | 512 | $BD00-$BEFF | engine | 512 |
| seg0 | 6,144 | $A500-$BCFF | flight | 6,137 in flight |
| pit.pac, nav.pac | 3,072, 3,328 | $4000 | flight | unpacked to the bitmap |
| nav.til | 4,352 | $4000-$50FF | flight | |
| q0-q7, q9 | 1,536 each | $5100-$56FF | flight | |
| sta and the other 13 models | 512 or 768 | $E400 | flight | |
| seg1 | 6,144 | $A500-$BCFF | station | 6,141 |
| seg1a | 1,792 | $E400-$EAFF | station | 1,792 |
| land.pac | 2,560 | $4000 | station | unpacked to the bitmap |
| land.til | 4,352 | $4000-$50FF | station | 4,352 |
| l00-l70 | 1,536 each | $5100-$56FF | station | l00: 1,491 at Hiathra |
| talk | 2,816 | $5700-$61FF | station | 2,816 |
| hcode | 1,792 | $5700-$5DFF | hive | 1,791 |
| h.pac | 2,816 | $4000 | hive | unpacked to the bitmap |
| h.til | 4,352 | $4000-$50FF | hive | 4,352 |
| h.map | 1,536 | $5100-$56FF | hive | 1,502 |
| won | 5,632 | $6800-$7DFF | ending | 5,605 |
| f1.pac, f2.pac, f3.pac | 3,584, 3,840, 3,072 | $8400, $9200, $A100 | ending | whole |
| data | 256 | | | not found in any snapshot |
