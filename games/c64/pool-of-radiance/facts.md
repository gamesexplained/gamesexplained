# Pool of Radiance — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is thirteen parts (`orientation.md`, "The parts"), and what is
true of one part is in that part's own `facts.md`, under
`parts/<id>/`. This file holds what spans them, and names the part
beside every address it gives.

## Build

SSI's version 1.0 of 1988, eight D64 images, one per disk side
(`orientation.md` lists their SHA-256). The boot program prints "POOL OF
RADIANCE, VERSION 1.0". Every file is an ordinary PRG on its side, and the
game asks for a side by number when the file it wants is not in the drive
(resident `disk_prompt`, `$4378`).

## Memory layout

| Thing | Where |
|---|---|
| The module in play: GEN, DUNGEON, CAMP, COM.PREP, COMBAT, POST.COM, FINAL or INIT | `$0800`, at most `$2B7F` (each its own part) |
| LINKER, the top loop that loads each module | resident `$2B80`-`$2C07` |
| LIBRARY, the engine every module calls through its jump table at `$2C48` | resident `$2C48`-`$48FB` |
| Timed effects, 64 entries in three columns (kind, holder, time) | resident `$4900`, `$4940`, `$4980` |
| The clock, the area, the party's place, the switches the saved game keeps | resident `$49C3`-`$49FF` |
| The combat icons, 36 bytes for each of the eight party slots | resident `$4BE0` |
| The working character: the record being read or changed, two pages | resident `$6B00`-`$6BFF` and its items' page `$6C20`-`$6D1F`; the party entry in hand between them, `$6C00`-`$6C1F` |
| The party's 32-byte entries, one per position | resident `$8300` |
| The engine's working variables, menus and item in hand | resident `$6D60`-`$6EFF` |
| Item names (ITEMNAMES) and item types (ITEMS) | tables `$6F00`-`$797B`, `$7B00`-`$82FF` |
| DUNGEON2 and COMBAT3, small code and tables INIT loads for the adventure and the battles | tables `$7A00`, `$7AC0` |
| The sound driver and its twelve sounds (SOUNDFX) | tables `$BA00`-`$BF53` |
| The fast loader (FAST1.O) | resident `$B700`-`$B8AC` |
| The 3D view's driver (GDRIVE01), or the battlefield's (GDRIVE00) | view `$C000`-`$C9FF`; combat-set `$C000`-`$CBDD` |
| The text screen, multicolour, in video bank 3 | `$CC00`, characters at `$D000` in the RAM under the I/O chips |
| Buffers files are loaded into as the game plays | the area's map `$0400`, its secret and wall sets `$6500`-`$6AFF`, pictures `$8C00`, sprites and the picture driver `$8400`, scripts `$9900`, spells `$A700` and `$AF00`, monsters `$6B00`, walls `$ED50` (resident `resource_dest`, `$41BE`) |

The resident engine loads files into 25 numbered resource slots, each
with a fixed address and a file name ending in two hexadecimal digits
that `load_resource` (resident `$4222`) writes before each load: GEO05 is
map 5 in slot 2 at `$0400`, ECL14 the script for map 14 in slot 8 at
`$9900`. A module marks a slot to load again when it uses that memory for
something else (resident `$6E13`-`$6E2B`).

## Timing

- The interrupt is the KERNAL's own, from CIA 1's timer, 60 times a
  second on the PAL machine as on the NTSC one; the game points its vector
  (`$0314`) at `irq` (resident `$3BEA`), which plays a step of the sound
  driver (tables `$BA00`) and goes on into the KERNAL's handler at
  `$EA31`. *Live*: 300 calls of `$3BEA` and 300 of `$EA31` in 250 PAL
  frames, in New Phlan; 300 calls of the title tune's player (title
  `$BA00`) in 250 frames at the title.
- The game's clock is six figures from `$49C6` (minutes, tens of minutes,
  hours, days, months, then the year at `$49CC`), carried by
  `add_time_unit` (dungeon `$0DEC`) and `clock_add` (camp `$124A`). A step
  in a town or dungeon is one minute, ten with Search on (dungeon
  `step_minutes`, `$08EA`); a move outdoors is twelve hours (dungeon
  `add_half_day`, `$1241`); a rest in camp passes five minutes a step
  (camp `rest_loop`, `$1D74`).
- The days gone by (`$49EC`) count every day that passes in the
  adventure module (tables `count_step`, `$7A5F`), but in camp only the
  months (camp `clock_add`). After a battle, POST.COM ages the party by
  that count and clears it (post-com `age_party`, `$1E1B`). *Live*: a
  day's rest in the slums put the clock's day on by one and left `$49EC`
  at 0; a step at 23:59 in New Phlan put it at 1.

## Controls

- The game takes one key at a time from the KERNAL's keyboard buffer and
  empties the buffer as it does, and reads the joystick in port 2 into
  `$03F0` (resident `read_input`, `$2E4E`).
- In a menu, cursor up and down (or `<` `,` and `>` `.`), cursor left
  and right, and the joystick move the highlight; RETURN or the button
  chooses (resident `menu_key`, `$306D`).
- In a town or dungeon, MOVE takes I or up to step forward, J or left
  and K or right to turn, M or down to step back (dungeon `move_command`,
  `$08F4`). Outdoors the keys 1 to 8 or the joystick give the eight
  directions, 1 north and on clockwise (dungeon `overland_move`,
  `$0ABA`).

## Graphics

- In play the screen is multicolour text at `$CC00` in video bank 3,
  with the game's font (CHARSET, title `$6500`) copied to `$D000` and the
  area's secret set and wall characters over the rest (dungeon
  `install_wall_def`, `$1485`).
- The 3D view is an 11 by 11 square of characters, built in a buffer at
  `$EC00` from up to 23 wall pieces, farthest first, then copied to the
  screen (view `draw_view`, `$C183`; `show_view`, `$C2B5`).
- A battle is drawn with its own driver, GDRIVE00, as a map of 3 by 3
  character tiles that scrolls round the combatant in hand (combat-set
  `draw_squares`, `$C069`).
- Portraits and close-up pictures are drawn and animated by ANIMATE, a
  file the engine loads at `$8400` (resident `start_view_picture`,
  `$8400`).
- The title is a hires bitmap at `$E000` with its colours at `$DC00`,
  unpacked from TITLEPG (title `title_packed`, `$6F00`).

## Mechanics

- **The modules.** `linker` (resident `$2B80`) loads the module whose
  number is at `$6E11` to `$0800` and calls it; when it returns, it loads
  the next. 0 is GEN (party creation), 1 DUNGEON (towns, dungeons and the
  wilderness), 2 COMBAT, 3 INIT (the title), 4 COM.PREP (the battle's
  setting up), 5 POST.COM (treasure, shops and temples), 8 FINAL (the
  ending) and 9 CAMP. Each module begins with the same three jumps at
  `$0800`.
- **Scripts.** Everything that happens in a place is decided by the
  area's script, a file ECLnn the adventure module interprets: 62
  commands (dungeon `command_handlers`, `$15A9`), each operand a kind
  byte and a value (dungeon `get_operand`, `$1663`), and the texts packed
  six bits to a character (dungeon `$150A`). A script starts with five
  GOTOs: before every step (`$9900`), on arriving in a square
  (`$9904`), before the camp (`$9908`), at `$990C`, and at the area's
  start (`$9910`) (dungeon `script_entries`, `$1A0B`).
  The scripts are data loaded at `$9900` and are in no part.
- **Maps.** A map (GEOnn) is four pages: the north and east walls of each
  of the 256 squares in the first, south and west in the second, a byte
  for each square in the third and the doors in the fourth, two bits for
  each side (view `wall_at`, `$C39A`; dungeon `door_state`, `$1143`). A
  square's number is its row times 16 plus its column (view
  `square_index`, `$C29D`).
- **Characters.** A character is two pages that the engine copies to
  `$6B00` and `$6C20` to read or change it (resident `load_character`,
  `$315A`), the second its sixteen items of 16 bytes; its 32-byte party
  entry goes to `$6C00` between them (resident `load_party_entry`,
  `$3189`). Armour class and THAC0 are kept as 60
  less their value, so that a better figure is a bigger byte (resident
  `print_ac`, `$3A36`).
- **Random numbers.** `random` (resident `$2D88`) is a lagged sum over
  the six bytes `$03C2`-`$03C7`; `roll_die` (`$2DE0`) gives 1 to N.
- **Saving.** A saved game is two files, SAVEDGAME0 and SAVEDGAME1,
  written by GEN and CAMP (gen `save_game`, `$24CD`; camp
  `save_command`, `$0CAB`).
- **The end of a game.** A lost battle prints THE PARTY HAS LOST and
  stops in a jump to itself (post-com `$0957`), unless a member was only
  marked out of the fight or the script let the party keep its fallen.
  *Live*. A second wrong code word stops the game the same way (title
  `$12F4`). *Live*.
- **Ageing.** The party ages by the days gone by after each battle
  (post-com `age_party`), and a character past its race's limit dies of
  old age (post-com `old_age`, `$215D`: dwarf 525, elf 1600, gnome 750,
  half-elf 325, halfling 199, half-orc 80, human 120).

## Data tables

- ITEMS: 128 item types of 16 bytes (tables `item_types`, `$7B00`). An
  item carried is 16 bytes of its own, with three word numbers into
  ITEMNAMES' 256 words (tables `item_word_lo`, `$6F00`), so LONG SWORD +1
  is three words.
- COMBAT3: the joystick's directions, the turning tables and the
  missile pictures' places (tables `$7AC0`-`$7AFE`).
- The temple's prices and its menu are in the file SQRPACI64, which
  POST.COM loads at `$0400` for a temple (post-com `heal`, `$209C`):
  in gold, cure blindness 1000, cure disease 1000, cure light wounds 100,
  cure serious wounds 350, cure critical wounds 600, neutralize poison
  1000, raise dead 5500, remove curse 3500, stone to flesh 2000, and two
  items the menu hides at 5000 and 20000. The file is in no part.

## Sound

- One driver plays both the sound effects and the title tune: SOUNDFX
  (tables `$BA00`) in play and its twin MDRIVER (title `$BA00`) at the
  title, with three streams of commands, one for each SID voice, eight
  instruments of nine bytes, and note lengths counted in interrupts
  (tables `sound_note`, `$BB0E`).
- SOUNDFX holds twelve sounds (tables `sound_table`, `$BD7B`); the
  modules start them through `$BA03` with the sound's number in A.
- The title tune is entry 12 of MUSIC (title `music_table`, `$C400`),
  1,100 notes and 92 rests on one stream, 5,976 interrupts long: about a
  minute and 40 seconds at 60 interrupts a second (title `title_tune`,
  `$C609`).
- The note table holds 84 frequencies from 536 (tables
  `note_frequencies`, `$BC8D`): on an NTSC machine's clock of 1,022,727
  Hz, 536 is 32.7 Hz, the C of the lowest octave; on a PAL machine, at
  985,248 Hz, the same numbers play about 3.7 per cent flat.

## The listing's error rate

One sample, seed 20261025, drawn from 4,157 comments in two strata:
3,905 written by hand and 252 written by a script from the item-name
table's bytes (the "Item word N" comments in the tables part). 80 were
drawn, 60 from the first stratum, spread over all 13 parts by their
size, and 20 from the second, and checked by one checker on
claude-opus-5-5[1m] with `kit/skills/core/60-verify/checker.md`. Every
verdict of wrong was read against the code, and all three held, all
among the 60 written by hand. The plain rate is 3 of 80, 3.75 % (95 %
interval 1.3 % to 10.5 %); weighted by the strata's sizes, about 4.7 %.
Both are over the mark (3 of the 60 written by hand) and are a lower
bound on the true rate. All three were wrong in a detail. dungeon
`run_square_script` (`$19FA`) said the square's script runs before each
MOVE key; it runs when MOVE starts and after each step, blocked or not,
and not after a turn. tables `sound_commands` (`$BAB4`) said a note
takes a voice whose stream is idle; it takes one whose gate time and
whose stream's wait are both 0, or the stream's own voice when none is
free. title `$BD42` called the gate times the streams'; they are the
voices', set under the voice a note takes. The last two were one belief,
that the driver's fields all belong to the streams, and it was written in
15 more comments of the title and tables parts (`sound_voice`,
`sound_note`, `sound_fields`, `voice_registers`, the release points and
`tune_silent`); all 18 were corrected. Before the sample, a live test
found the interrupt is CIA 1's timer at 60 a second, where ten comments
said a raster interrupt at 50 (resident `irq`, title `note_lengths` and
the title tune's eight sections); they were corrected too.
After the sample, two more were corrected while the pages were built.
Holding the script decoder to the game's own `get_operand` showed that
dungeon `operand_counts` (`$1625`) gives ADD NPC one operand fewer than
its routine reads, where the comment named only two such commands. Camp
`$1E0F` said the rest's roll is 1 to 100 under the chance; the roll is
0 to 99, roll_die's result less one, so the chance is that many in 100.

## Live tests

- Two wrong code words: from `codeword_prompt`, ZZZZZZ typed twice. The
  first brought a new rune and path, the second WRONG !!!, and the
  program counter stayed at `$12F4` (title part).
- A lost battle: from `entry_postcom_1299`, stopped at `$0903` (post-com),
  the party's standing count `$2B09` and fled count `$2B05` set to 0. The
  screen read THE PARTY HAS LOST and the program counter stayed at
  `$0957`.
- Resting in New Phlan: REST for a day from `camp`. The rest ended after
  five minutes and the town's script printed YOU ARE ROUSTED BY THE CITY
  WATCH AND TOLD TO MOVE ALONG; the town keeps `$6DD2` = 1 and `$6DD3` =
  101.
- Resting in the slums: ENCAMP from `slums_enter`, the rest time set to a
  day. The clock's day went from 0 to 1 and the days gone by (`$49EC`)
  stayed at 0. In New Phlan, with the clock set to 23:59, one step put
  `$49EC` at 1.
- ORDER and the timed effects: an effect put on Lara Spellsword (slot 1)
  from `camp`, then ALTER, ORDER with Lara first and Arax the Bold second.
  The effect's holder (`$4940`) read 1 afterwards, Arax's new slot.
- The interrupt's rate: non-stopping checkpoints on `$3BEA` and `$EA31`
  over 250 frames, 300 hits each; on the title tune's player (`$BA00`)
  from `title_play`, 300.
- The processor port: with the machine stopped in New Phlan, `$01` set to
  each of `$37`, `$34`, `$33`, `$32`, `$31` and `$30` and `$A000`,
  `$D000`, `$D800` and `$E000` read as the processor sees them. `$30`, the
  value `all_ram` (resident `$3AAB`) writes, showed RAM at all four.
