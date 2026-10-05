# Wasteland — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is in 64 parts (`orientation.md`, "The parts"): a resident
engine, the programs loaded over it, nine tile sets and 42 maps. What is
true of one part is in that part's own `parts/<id>/facts.md`, with that
part's addresses. This file holds what spans the parts, and names the
part beside every address it gives: "engine `$25BD`" is the engine's
routine at `$25BD`.

## Build

- The Electronic Arts release on two double-sided disks, four sides,
  with the boot files `PRODOS` and `2.0` on sides 1 and 3 and the game's
  data in raw sectors on all four (`orientation.md`, "The image").
- Written by Alan Pavlish: the start-up's bar reads "Start Utils
  Written by Alan Pavlish" (startup `$81AD`), and its packed text
  "Electronic Arts and Interplay Productions proudly present" and
  "Copyright 1986-88 Interplay Productions." (startup `$84BE`,
  `$8505`).
- The full credits are inside the game, as a poster in map 33: message
  92 of its text block (map-33 `$514F`) reads "A computer software
  poster reads, "WASTELAND!"" and lists programming, design, maps,
  graphics, general help and playtest, 23 names, ending "Rated PG-13.
  Coming soon to a theatre near you." Map 1's message 26 is a
  gravestone: "Ken St. Andre, 4/28/47--4/28/87." (map-01 `$4300`).
  The string sweep of every program part and the decoded text of every
  text block (the programs' and the 42 maps' 4,576 messages) find no
  other credit.
- Side 3 holds an older build of the start-up at track 4, logical
  sector 16 (entry `$7E06`, against side 1's `$7F2A`; 2,766 of its 4,096
  bytes differ), and its own boot sector, named "A JERKVISION
  PRODUCTION". Its credits read "Copyright 1986,87 Interplay
  Productions." where side 1's read "1986-88", and where side 1's
  start-up calls its title sounds, side 3's calls three `RTS` stubs
  (`$7E03-$7E05`) and writes no SID register. Booted, side 3 cannot run: its `2.0` loads side 3's track
  34, logical sector 10 to `$0200-$30FF`, where side 1 has the engine
  and side 3 has other bytes, and the first raster interrupt after the
  hand-over goes through engine `$04F9` into them and halts the
  processor on a `JAM` at `$2931` (*live*). Run over side 1's engine
  instead, with side 3 in the drive, it shows a title picture it unpacks
  from side 3's track 3 and stops at "Computer defense initiative
  activated." (*live*, `reference/side-3-start-up.png`).
- Leftovers: three loads carry copies of other programs' bytes past the
  end of their own code, assembled for other addresses.
  - The Ranger Center's `$8600-$8FFF` is the radio program's
    `$7E00-$87FF`, all 2,560 bytes.
  - The radio's `$874B-$87FF`, and so also the Ranger Center's
    `$8F4B-$8FFF`, is the game's `$874B-$87FF` except two operand bytes
    (`$87B4`, `$87B9`), each 4 lower than the game's: a copy from a
    slightly different build of the game.
  - The start-up's `$860B-$86FF` is the engine's `$0A0B-$0AFF`.

## Memory layout

In play (`parts/game/work/play-map.vsf`), with `$01` = `$35`: all RAM
but the I/O area, both ROMs out.

| Range | What | Part |
|---|---|---|
| `$0000-$00FF` | the engine's zero page; `$02-$0F` are saved with the game | engine |
| `$0200-$30FF` | the engine: two jump tables (`$0204-$044E`, `$04CF-$0504`), its code and its text block (`$29E4-$30FF`) | engine |
| `$3100-$33FF` | the item table: eight bytes an item | game |
| `$3400-$59FF` | the map the party is in: class layer, number layer, record, lists, text and code | map-*nn* |
| `$5A00-$5AFF` | the sector buffer | engine |
| `$5B00-$5BFF` | tables and work space the boot file copies from its `$C17B`, among them the menu bar's text at `$5BAB` | engine |
| `$5C00-$5FFF` | the screen matrix: the bitmap's colours | engine (output) |
| `$6000-$7DFF` | the bitmap, 24 character rows | engine (output) |
| `$7E00-$C5FF` | the program in play: the game, or the start-up, the utilities, the Ranger Center, the radio or the death screen | each its own part |
| `$C600-$C9FF` | the font, the track table `$C930`, the key table `$C953`, the sound player `$C993` and its three sounds | engine |
| `$CA00-$CFFF` | a module, the party-order program, or a picture unpacked for the picture window | module-*n*, order |
| `$D000-$DD7F` | the tile set, in RAM under the I/O area | tiles-*n* |
| `$DD80-$DDFF` | the map window's scroll copy, in RAM under the I/O area | engine |
| `$DE00-$EDFF` | the tile layer of the map, one byte a square, under the I/O area and above it | map-*nn* |
| `$EE00-$F3FF` | cleared by the start-up (startup `$7F3D-$7F55`); the game keeps four 376-byte records from `$EE00` (game `$BBC7`) | engine |
| `$F400-$FBFF` | the game state: party tables, saved zero page, line buffer, character records from `$F500`, written to the disk as the save | engine |
| `$FC00-$FFFF` | the fast loader's computer side, and the hardware vectors in RAM | engine |

The bitmap's 25th character row would be `$7E00-$7F3F`; with `$D011` =
`$B7` (24 rows) it is not shown, and the programs load from `$7E00`.

## The disks and the loader

- Every read and write goes through the fast loader (engine `$FF00`),
  installed by the boot file. It moves whole 256-byte sectors with no
  link bytes: a file is a track, a logical sector and a page count, and
  logical sectors run down from there.
- Logical sectors map to physical ones by a table per speed zone: on
  tracks 1-17 logical *n* is physical 10*n* mod 21, on 18-24 8*n* mod
  19, on 25-30 7*n* mod 18, on 31-35 6*n* mod 17 (engine `$FFD3`,
  `$FDEA`, `$FDD8`, `$FFE8`).
- After logical sector 0 the loader goes on to the track below, skipping
  track 18, at the logical sector the table at engine `$C930` gives for
  that track (engine `$FD0B`). The table is laid out as if indexed by
  the track number less one, and is indexed by the track number: track
  17 is entered at logical sector 0, track 24 at 17 and track 30 at 16,
  below their top sectors of 20, 18 and 17. Files are laid out on the
  disks by the same rule: maps 0, 2, 5, 11 and 19 cross one of those
  tracks, and each loads the sectors the rule names, not the ones a full
  track would give (the 42 maps loaded by the game's own `enter_map`
  compared with the image read both ways). The game writes through the
  same routine.
- Directories are on tracks 34 and 35, 64 four-byte entries a sector,
  the fourth byte the side that holds the file (engine `$2790`).
  - File directories, track, logical sector, pages and side: maps
    T35/L14, item tables T35/L15.
  - Stream directories, a start byte, a count of sectors from the base
    track and sector in the directory sector's last two bytes, a count
    of input pages and the side: modules T34/L16, map streams T35/L13,
    tile sets T35/L12, pictures T35/L10 (engine `$2759`).
  - Every side carries every directory. A file stored on several sides
    is read from the side in the drive; one stored on one side is asked
    for by its number (engine `$27C3`).
- Packed streams are unpacked by code the engine loads over the font's
  last page, `$C800`, from T35/L16 for each unpack and replaces from
  T35/L11 afterwards (engine `$0524`).
- A disk error prints "I/O ERROR" or "Write protected", then
  ". (RETURN)", on row 23, and RETURN, space or back-arrow retries;
  nothing gives up (engine `$280C-$283E`).

## Play disks and the side check

- Each side's identity is the last three bytes of T35/L8: `$D7 $CC`
  *side* on the masters, `$00 $CC` *side* on copies (`orientation.md`,
  "The play disks").
- The side check (engine `$1897`) reads T35/L8 and wants its byte `$FD`
  to equal `$ED`, its byte `$FE` to be `$CC` and byte `$FF` the side
  asked for; until they are, it prints "INSERT SIDE *n*. (RETURN)". `$ED`
  is 0 in play, so the masters are refused (*live*). The start-up sets
  `$ED` to `$D7` only around the check of side 1 before it loads the
  utilities (startup `$81E4-$81ED`), which is how Copy reads the masters.

## Saving and the persistent world

- Each map is written back to its own sectors when the party leaves it
  (engine `$2856`, from `$25BD`); a map entered by a number from `$80`
  up (the generic maps 5 and 11) never is (engine `$2858`).
- `save_game` (engine `$18EA`) copies zero page `$02-$0F` to
  `$F478-$F485`, sums `$F400-$FBFF` into one byte (engine `$1918`: for
  each page and *Y* = 0-254, the sum plus the byte, then plus *Y* and
  the carry out of that first addition; the carry out of the second is
  dropped, and byte 255 of each page is left out), keeps the sum at
  `$F4FF`, scrambles bytes 0-254 of every page by EOR with (2*Y* mod
  256) EOR the sum (engine `$1944`), writes page *n* to T35, logical
  sector 7-*n*, and unscrambles. The key is the byte at `$F4FF`, saved
  in clear. The start-up reads the eight sectors back, unscrambles and
  checks the sum (startup `$830E-$832D`). *Live*: member 1's cash set
  to 12,345 in play and saved with S and Y; the eight sectors read off
  the disk image afterwards are this rule applied to memory as the save
  began, all 2,048 bytes, with the key `$6B` the sum as the code forms
  it.
- `save_game` has no side check, so a save lands on the side in the
  drive. It is called by Save (game `$8820`, after asking for side 1),
  by Radio (game `$8802`, before asking for side 1), at the end of every
  map change (engine `$2600`), by modules 1 and 3, by the Ranger
  Center's Start and by the utilities.

## Text

- Every program has its own packed text block; the engine prints from
  the one `$43/$44` points at (engine `$1DFB`). The engine's is
  `$29E4-$30FF`, messages 0-169.
- A block is a 60-byte alphabet, then a table of words, each the offset
  from the table to a group of four messages, then the groups. Codes
  are five bits, lowest bit first (engine `$291D`): code `$1E`
  capitalises the next letter, `$1F` adds `$1E` to the next code, and
  the code whose alphabet byte is 0 ends the message (engine `$28F4`).
- Control codes in the text (engine `$1F42`, `$1F64`): `$0A` singular
  or plural on the count `$38`, `$0B` the current character's name,
  `$0C` his or her, `$0E` him, her or it, `$0F` the count, `$0D` a new
  line, `$05` and `$06` wait for RETURN.

## Screen and controls

- The screen is a multicolour bitmap at `$6000` with its colours at
  `$5C00`, in VIC bank `$4000` (*live*: `$DD00` = `$86`, `$D018` = `$79`,
  `$D011` = `$B7`, `$D016` = `$D8`). Text is drawn into the bitmap from
  the 6-pixel font at `$C600` (engine `$1F03`).
- The one interrupt is the raster interrupt (engine `$2947`), which
  scans the keyboard; the NMI vector ends in an `RTI`, so RESTORE does
  nothing (engine `$2966`).
- Keys are read through the table at `$C953`: Apple II-style codes with
  bit 7 set, no shifted keys, no repeat, one new key per interrupt
  (engine `$29BD-$29D4`).
- Menus are a bar of words with hidden keys (engine `$1B36`, `$1BBF`):
  the game's bar is "Use Enc Order Disband View Save Radio", and its
  hidden keys I, J, K and L move the party, back-arrow and space (game
  `$7F18`).

## Live tests

- Side 3 booted on its own; side 3's start-up run over side 1's engine
  (`$7E00-$8DFF` replaced at the hand-over, side 3 attached): above.
- The masters refused in play, the Copy utility's copies accepted
  (`orientation.md`, "The play disks").
- Space in play: `$6A` from 0 to 1 and the roster drawn over the
  bottom of the map window.
- I, J, K and L in play move the party north, west, south and east
  (party position `$57/$58` before and after each key).
- The play screen captured with `kit/c64/frame.py` and drawn by
  `site/lib/c64.js`: 0 of 104,448 pixels differ from the emulator's
  picture, with the roster hidden and shown.
- Every map entered with the game's own `enter_map`, its pages, stream
  and tile set measured with two fills (`orientation.md`, "The maps").
