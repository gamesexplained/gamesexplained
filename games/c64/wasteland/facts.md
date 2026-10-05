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
  graphics, general help and playtest, 26 credits to 20 people, ending
  "Rated PG-13. Coming soon to a theatre near you." It is one of four
  messages on one wall square (column 20, row 25, class 11), each bump
  showing the next: 91 "Coming soon, "The Radheads!"", 92 the credits,
  93 and 94 two more films, then 91 again (*live*). Map 1's message 26 is a
  gravestone: "Ken St. Andre, 4/28/47--4/28/87." (map-01 `$4300`), shown
  on the graveyard's square at column 27, row 24 (*live*).
  The string sweep of every program part and the decoded text of every
  text block (the 52 blocks' 4,920 messages, 478 the programs' and 4,442
  the maps') find no other credit: the start-up's lines above are the
  only others that name a maker.
- Five people the poster credits are named elsewhere in the maps' text,
  each message shown by squares of its map as it loads (the squares'
  records, read with the Maps tab's port):
  - map 13 message 70, on six wall squares: a wanted poster for Nishan
    Hossepian, "for crimes against computer software";
  - map 33 message 27, at column 7, row 27: "Bill Dugan,
    Representative, Temple of Blood.";
  - map 34 message 76, a wall at column 24, row 13: "Chalked on the
    wall: Dugan, B -- Rad overdose / Christensen, C -- Anthrax / Gonif,
    T -- Cirrhosis";
  - map 38 message 90, a wall at column 1, row 12: a poster of a man
    typing at a computer, "STANCE THE GREAT MAP MAKER";
  - and Ken St. Andre's gravestone, above.
- Side 3 holds an older build of the start-up at track 4, logical sector
  16 (entry `$7E06`, against side 1's `$7F2A`; 2,766 of its 4,096 bytes
  differ), and its own boot sector, named "A JERKVISION PRODUCTION". Its
  credits read "Copyright 1986,87 Interplay Productions." where side 1's
  read "1986-88", and where side 1's start-up calls its title sounds,
  side 3's calls three `RTS` stubs (`$7E03-$7E05`) and writes no SID
  register. Booted, side 3 cannot run: its `2.0` loads side 3's track
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
| `$0200-$30FF` | the engine: two jump tables (`$0204-$044E`, `$04CF-$0504`), its code and its text block (`$29E4-$30FE`) | engine |
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

The bitmap's 25th character row would be `$7E00-$7F3F`; with `$D011` set
to `$37` (24 rows, startup `$7F55-$7F57`) it is hidden, except that
screen_shake's random vertical scroll (engine `$077A`) brings its top
lines into view for a moment, and the programs load from `$7E00`.

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
- Packed streams are unpacked by code the engine loads over the third
  of the font's four pages, `$C800` (glyphs `$60-$7F`, the lower case),
  from T35/L16 for each unpack and replaces from T35/L11 afterwards
  (engine `$0524`).
  T35/L11 holds the same 256 bytes as the third page of the font's own
  file, four pages from T34/L14 (engine `$C800`).
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
  in clear. The start-up reads the eight sectors back, unscrambles them
  and compares the sum (startup `$830E-$832D`), but a sum that does not
  match is accepted: every byte is EORed with twice its offset again,
  which leaves it as stored EORed with the key alone, and the start-up
  goes on with no message (startup `$832F-$834C`). So a save written in
  clear with a key of 0 loads as written, unless the sum the start-up
  forms from it comes out 0. *Live*: member 1's cash set
  to 12,345 in play and saved with S and Y; the eight sectors read off
  the disk image afterwards are this rule applied to memory as the save
  began, all 2,048 bytes, with the key `$6B` the sum as the code forms
  it.
- `save_game` has no side check, so a save lands on the side in the
  drive. It is called by Save (game `$8820`, after asking for side 1),
  by Radio (game `$8802`, before asking for side 1), at the end of every
  map change (engine `$2600`), by modules 1 and 3, by the Ranger
  Center's Start and by the utilities.

## The maps

- A map in memory is two areas. From `$3400`: the class layer, a nibble
  a square, the high nibble for an even column (engine `$0953`); the
  number layer, a byte a square (engine `$098E`); then the map record,
  at `$3A00` on a 32 x 32 map and at `$4C00` on the four 64 x 64 maps,
  0, 12, 22 and 26. From `$DE00`: the tile layer, a byte a square
  (engine `$0B06`), unpacked from the map's stream.
- The record begins with a `$5C`-byte header: address words for the
  packed text (engine `$1E4F`), the monster names and records (game
  `$9E76`, `$9EA4`), a list of records for each square class 0-15
  (engine `$09B8`), the map's own routines (game `$885C`) and its
  non-player characters (game `$A424`); then the size (`+$2C`, engine
  `$25D3`), the chance of a random encounter after a step (`+$2F`, game
  `$B017`), the tile set (`+$30`, engine `$25EE`), the tile drawn off
  the map (`+$33`, engine `$0B5E`), what a step costs (`+$34` and `+$35`,
  a fraction of a minute and minutes, and `+$36`, ticks of the elapsed
  count, game `$AF32-$AF72`), and 37 message numbers for the phrases of
  combat (`+$37-$5B`, game `$BCE1`, `$BCE5`).
- A square is a class and a number. When the party moves into it or
  arrives on it, its class's handler (game `$ACF3`, a table of 16 words)
  runs on the record that word *number* of the class's list names
  (engine `$09B8`): class 1 shows a message, 2 tests the party (skills,
  attributes, items, cash, party size), 3 and 15 are encounters, 4 shows
  another tile and a message, 5 is loot, 6 an action, 8 a question, 9
  radiation, 10 an exit, 11 a wall that shows its message when walked
  into (game `$915E`), and 12 changes other squares. Classes 0, 7, 13
  and 14 do nothing, and no map uses 7, 13 or 14.
- Radiation shows only at night: a class 9 square is drawn as tile 8,
  the radiation sign, from 18:00 to 05:59, and as its ground the rest of
  the day (engine `$0B80-$0B8A`; *live*). Tiles 0-8, the party, the
  creatures, the loot bag and the sign, are the same bytes in all nine
  tile sets as they load (the nine sets compared byte for byte); maps 0
  and 26 exchange tile 7's bytes with the jeep's or the train's for
  their rides (map-00 `$4FCD`, map-26 `$4EF9`).
- Whether armour stops radiation depends on the square's message
  number. The radiation handler sets `$A0`, "ignore armour", to 1
  (game `$82E7`), but the routine that applies the damage replaces it,
  for each member, with bit 0 of the square record's byte 0 (game
  `$90AF-$90B4`), which is the flag byte of the check squares it was
  written for and the message number of a radiation square. So armour
  counts on radiation squares whose message is even and not on those
  whose message is odd. The radiation records name messages 23 on map
  0, 28, 29 and 30 on map 19, 69, 70 and 71 on map 20, 0 on map 26, 12
  on map 31, and 43 and 0 on map 38 (*live*).
- Records change squares by pairs of class and number (engine `$0A00`).
  An action square's byte `$80` + *n* loads module *n* to `$CA00` and
  runs it; a smaller *n* calls the map's own routine *n* (game `$8845`).
- Nothing checks a list's word before it is used (engine `$09B8`). On
  map 11 the square at column 24, row 13, a wall on the screen, is class
  2 number 2, and word 2 of class 2's list is `$0000`, so its record is
  read from address 0 on: the processor's port registers, then zero
  page. Its flags are the port's direction register, `$2F`, which has
  no checks tested and the move refused; the message it shows is the
  byte at `$0001`, the port, `$35`. So walking into that wall prints map
  11's message 53, "Ah! Fresh air and open spaces once again.", every
  time (*live*). The wall is next to squares the party can walk to from
  the map's exit at column 28, row 0 (a search of the map's classes).

## Text

- Every program has its own packed text block; the engine prints from
  the one `$43/$44` points at (engine `$1DFB`). The engine's is
  `$29E4-$30FE`, messages 0-169, and `$30FF` is a spare byte.
- A block is a 60-byte alphabet, then a table of words, each the offset
  from the table to a group of four messages, then the groups. Codes
  are five bits, lowest bit first (engine `$291D`): code `$1E`
  capitalises the next letter, `$1F` adds `$1E` to the next code, and
  the code whose alphabet byte is 0 ends the message (engine `$28F4`).
- Control codes in the text (engine `$1F42`, `$1F64`): `$0A` singular
  or plural on the count `$38`, `$0B` the current character's name,
  `$0C` his or her, `$0E` him, her or it, `$0F` the count, `$0D` a new
  line, `$05` and `$06` wait for RETURN, space or back-arrow (wait_return,
  engine `$2501`).

## Screen and controls

- The screen is a multicolour bitmap at `$6000` with its colours at
  `$5C00`, in VIC bank `$4000` (*live*: `$DD00` = `$86`, `$D018` =
  `$79`, `$D011` = `$B7`, `$D016` = `$D8`). The start-up writes `$D011`
  as `$37` (startup `$7F55-$7F57`, `$7F91-$7F93`); bit 7 reads back as
  the high bit of the raster line, which was past 255 when it was read.
  Text is drawn into the bitmap from the 6-pixel font at `$C600` (engine
  `$1F03`).
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
- The joystick: from play-map.vsf, a stick held on control port 2 for
  two seconds in each of the four directions and on fire, with
  checkpoints that do not stop on reads of CIA 1's port A (`$DC00`) and
  port B (`$DC01`) and, as the control, on the interrupt handler
  (engine `$2947`). The party stayed at column 55, row 62 (`$57/$58`),
  and in each hold port A was read 0 times against 203 or 204 reads of
  port B and as many interrupts; I then moved the party north, to row
  61. The same stick on port 1, whose lines are port B's, moved nothing
  either, but up brought up the first member's character sheet and fire
  turned it to the items page, as keys of the keyboard would.
- The click of a step: from play-map.vsf, L, L, K and J pressed with
  checkpoints that do not stop on step_done (game `$AE26`), play_sound_16
  (engine `$0741`) and play_sound (engine `$C993`). The three steps the
  party took called each once; K, which the map refused, called none.
- The play screen captured with `kit/c64/frame.py` and drawn by
  `site/lib/c64.js`: 0 of 104,448 pixels differ from the emulator's
  picture, with the roster hidden and shown.
- Every map entered with the game's own `enter_map`, its pages, stream
  and tile set measured with two fills (`orientation.md`, "The maps").
- The save: member 1's cash set to 12,345 in play, S and Y pressed, the
  eight sectors of T35/L7-L0 read off the disk image afterwards and
  compared with the rule above applied to memory as the save began: all
  2,048 bytes agree, key `$6B`.
- The credits poster: the party put north of map 33's poster wall with
  the game's own `enter_map` and K (south, into the wall) pressed five
  times, with RETURN through the credits' six screens; the messages came
  91, 92, 93, 94, 91, and the clock did not move.
- The gravestone: the party put on map 1's grave at column 27, row 25
  and I pressed; on the square north of it the game printed "The
  gravestone is inscribed: Ken St. Andre, 4/28/47--4/28/87."
- Map 11's wall with no record: the party put at column 23, row 13 with
  the game's own `enter_map` and L (east) pressed three times; each
  press printed message 53 and left the party, the square (class 2,
  number 2) and the clock as they were. The processor read `$2F $35` at
  `$0000-$0001` throughout.
- Radiation by the hour: the party put at column 57, row 38 of the
  world map and the view redrawn with the game's own `redraw_view`
  (game `$AC8C`) at 5:00, 6:00, 12:00, 17:00 and 18:00. The 36
  radiation squares around the building at columns 57-58, rows 36-37
  showed the sign at 5:00 and 18:00 and plain ground at the other
  three.
- The idle turn: play-map.vsf run for 3,000 frames with no key, with
  checkpoints that do not stop on the main loop (game `$7E63`), its
  idle turn (game `$7E93`) and, as the control, the interrupt handler
  (engine `$2947`): 2,999 interrupts, 58,486 passes of the loop (19.5
  a frame), three idle turns, and the clock from 1:24 to 1:36, four
  minutes a turn on the world map. So with no key pressed a turn
  passes about every 840 frames, 17 seconds on a PAL machine.
- The main loop's pace: play-map.vsf run for 1,000 frames in chunks of
  50, with the same checkpoints: 1,001 or 1,002 passes of the loop in
  every chunk (20.02 a frame) with `$9F` = `$FF` (no radiation in
  view), and 471 in the one chunk that held an idle turn. The port of
  the loop on the page makes 21.19 passes a frame on a processor that
  has every cycle; giving the video chip 1,075 cycles a frame brings it
  to 20.02, and the Geiger counter's player on the How it works page
  runs it so.
- The attribute roll: from the Ranger Center creating a character,
  SPACE rolled 32 attributes; each ended as a model of the broken
  exchange loop predicts, and 21 came out below the best three of
  their five dice (ranger `$8382-$83C0`; `parts/ranger/facts.md`).
- Radiation and armour: from play-map.vsf, every member's armour class
  set to 30 and CON to 200, the party stepped west onto the world map's
  radiation square at column 55, row 38 (record message 23, 5d6). With
  the message left at 23 the armour roll (game `$A8C5`) was skipped for
  all four members and they lost 22, 23, 16 and 14 CON; with it poked
  to 22 the roll was taken four times and nobody lost any.
- The dice in play: from the Ranger Center's attribute screen
  (play-create.vsf), SPACE pressed 125 times after random waits of 0.05
  to 0.5 s; a checkpoint at ranger `$8390` read the five dice of each of
  1,000 attribute rolls: 1,043 ones, 869 twos, 786 threes, 727 fours,
  749 fives and 826 sixes (even dice: 833 each), and two neighbours
  equal 699 times in 4,000. From play-map.vsf, a stub threw 4,096 pairs
  of dice with roll_2d6_open's instructions between them (engine
  `$084A-$0850`), each after the seed was moved 1 to 256 times as
  read_key moves it: 869 doubles, 21.2% (fair dice: 16.7%).
- Double experience for melee kills: from play-map.vsf, the party put
  in map 1's graveyard at column 27, row 25 with the game's own
  `enter_map`, every member's weapon cleared so that all four fought
  with fists, and K (south) pressed: "3 Shambler Ghouls appear at 14
  feet." With every member ordered to attack each round, ten melee
  rounds (game `$7F64`) brought three kills. Each kill was worth 40
  experience (engine `$1C-$1E` at game `$8163`), and each killer's experience
  went from 0 to 80 across the two adds at game `$8163` and `$8166`.
  The screen named the kill ("KIT hammers the Shambler Ghoul for 6
  points of damage killing it.") and printed no experience.
- The unlucky throw: from play-map.vsf, the same graveyard (map 1,
  column 27, row 25, `enter_map`), every weapon cleared, then Hell
  Razor (record `$F500`) given LK 3 (`+$10`) and a Throwing knife
  (item 15) in slot 1, equipped (`+$BD`, `+$1F` = 1); K brought "2
  Shambler Ghouls appear at 14 feet." With every member ordered to
  attack, the first throw stopped at game `$A7E7`, where weapon_damage
  has written the roll into its two `ADC` operands (`$A7EC`, `$A7F0`):
  the roll was 10, and 2 and 0 were written there, the roll of a 1 and
  a 1. weapon_damage returned 65,535 (`$A7F3`: X:A = `$FFFF`), the kill
  path at game `$A6E5` ran, and the screen read "Hell Razor attacks
  and hits 1 Shambler Ghoul for 65532 points of damage spinning it into
  a dance of death." (reference/unlucky-throw.png).
- Who can make that throw: the luck bonus is −3 for LK 3 or 4, −2 for
  5 or 6 and −1 for 7 or 8 (game `$A7C3`); weapon_damage adds it to the
  roll with plain `ADC`s (`$A7EA-$A7F0`), while the melee path adds it
  through num2_add_clamped (engine `$07C6`), which stops at 0. Of the
  item table's thrown and fired weapons the Throwing knife has the
  fewest dice, 2 (item 15, byte 6); every other gun and rocket has 3 or
  more (the Mangler's and Sabot rocket's 2 × dice − armour is never
  fewer than their dice), and explosives take no luck (`$A054`). So only
  a 1 and a 1 on the knife with an LK of 3 or 4 goes below 0. No loot
  record of the 42 maps names item 15 or a random class-2 item (43
  records, scanned with the levels page's port); Christina, NPC 1 of
  map 32 (`$40AE`), carries one in her slot 3. The ranger roll gives an
  LK of 3 or 4 for 261 of the 7,776 ways five dice fall (3.4%), the best
  three of five for 6. The highest hit-point seed of any named monster
  in the 42 maps is the Night Terror's, 32,000 (map 23, monster 1),
  which gives at most about 40,000 hit points (game `$9483-$94B9`).
- The pictures' pace: the title run from the start-up's play-title
  snapshot for 2,000 frames with no key, with checkpoints that do not
  stop on the animation tick (engine `$05C5`), the calls that pass its
  flags (engine `$05DA`) and the channels' step (engine `$05E6`), read
  every 50 frames. While the title's picture moved, the engine called
  the tick 3,508 to 3,553 times in 50 frames, every call passing the
  flags, and the channels stepped 7 times, about 7 steps a second; in a
  later stretch of the same sequence 2,624 to 3,176 calls and 5 or 6
  steps. Between the two the flag at engine `$AC` was 0 and nothing moved.

## Comment sample

- Before the audit: seed 1988 drew three comments from each of 21 strata
  out of the 11,532 line and side comments that the 64 parts' listings
  hold as their own (`work/lead/sample.py`): one stratum for each
  annotator's range, and one for the maps' descriptions that a decoder
  wrote, 7,973 comments (69%). Three agents that wrote none of the 63
  checked them against the bytes: 48 were right, 14 had a wrong detail
  and 1 had the code wrong, so 15 of 63, 23.8% (Wilson 95% interval
  15.0-35.6%). Weighted by the strata's sizes the rate was about 52%,
  because two of the three generated descriptions drawn carried an error
  of their template. The details were callers and paths left out,
  counts, the keys a prompt takes, and a field read alike for every
  value of a flag; the one wrong comment had taken an operand's value in
  the snapshot for a constant (map 49's poisoned needle, said to miss
  its target: the member comes from an operand the game writes when a
  Use begins). All 15 were rewritten to agree with the code.
- The audit: 22 agents that wrote none of the comments then checked all
  11,532 against the bytes, the hand-written ones by range and the
  generated ones by template, and rewrote 2,441: 424 of the 3,559
  hand-written comments and 2,017 of the 7,973 generated ones. Of those,
  627 had the code wrong and the rest a detail. The generated
  descriptions' errors came from their templates: a check square's tests
  said to run when the party arrives, where with bit 7 of its flags
  clear they run on a move onto the square, and with bit 6 clear only on
  a Use; readers cited for a field they read only for some values of a
  flag; encounter ranges given without their unit (feet, ten to a
  square); exits said to lead to maps 128 and above, where the game
  loads map 5 or 11; the armour roll that bit 0 of a record's first byte
  decides left out; and map bytes that a BIT in the game or the engine
  addresses, said to be read by nothing, where the BIT runs and reads
  them, to no effect. The hand-written ones' were the sample's kinds.
  The lines of these facts files and of the pages that repeated such a
  claim were rewritten with them.
- After the audit: seed 6510 drew a second sample the same way, three
  from each of the 20 hand-written strata and 20 from the generated one,
  and four more agents that had written and audited none of it checked
  the 80: 77 were right, 3 had a wrong detail and none had the code
  wrong, 3.75% (Wilson 95% interval 1.3-10.5%). Of the hand-written
  comments 3 of 60 were wrong in a detail, 5.0% (1.7-13.7%); of the
  generated ones none of 20 (0-16.1%); weighted by the strata's sizes,
  1.25%. The three: one of the game's three instructions that address a
  byte left out (death `$7E0C`); the skill list's header said to print
  on row 2, where the new line it opens with puts it on row 3 (module 2
  `$CC63`); and play_sound's last write said to start the note, which
  sound 11's does not, its control byte `$A4` having the gate bit clear
  (engine `$C993`). All three were rewritten, and so were five
  neighbouring comments of the death screen that left out the game's
  instructions in the same way.
