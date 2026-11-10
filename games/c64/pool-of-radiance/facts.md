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
- The game's clock is kept from `$49C6`: a figure the adventure module
  never changes, then minutes (`$49C7`), tens of minutes (`$49C8`),
  hours (`$49C9`), days, months, and the year at `$49CC`, carried by
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
- A map's walls are three wall sets, each a WALLDEF (780 character codes,
  five shapes of 156, then their colours packed) and a WALLSET (50
  characters, at `$6A`, `$9C` or `$CE` for the first, second or third
  set). `install_wall_def` (dungeon `$1485`) adds 0, 50 or 100 to every
  code of `$6A` or more (`renumber_wall_chars`, `$14CB`) unless the set's
  flag (`$49E7` + the set) is set, puts the codes at `$ED50` + 780 × the
  set and unpacks the colours to `$F674` + 780 × the set
  (`unpack_pushed`, tables `$7A00`). A wall number 1-15 on the map is
  set (n - 1) / 5, shape (n - 1) mod 5. New Phlan loads WALLS00 (all
  4,680 bytes) and SECSET00 (192 characters from `$40`); every other map
  SECSET02 (42 characters). Held by `test_graphics.js` for all 18 WALLDEF
  files in each set, flag clear and set.
- Three scripts SAVE to `$49E7` and `$49E8`. The graveyard (side 4,
  ECL0A) sets both to 1 at its arrival entry (`$9A72`), before loading
  WALLDEF15, 16 and 14, and to 0 on its way out (`$9932`). Valjevo
  Castle's bailey (side 5, ECL06) sets them to 1 at its arrival entry
  (`$9C5A`), before loading WALLDEF18, 19 and 01, except when the last
  script was its own (`$49F2` = 6), and to 0 on a way out (`$9B7F`); the
  keep (ECL07) sets them to 0 on its way out to New Phlan (`$A8DA`). The
  castle's other blocks (ECL03-ECL05) keep the bailey's sets and flags.
- `set_wall_colour` (dungeon `$1157`): bit 7 of the square's byte on the
  map's third page picks `$49FE`, otherwise `$49FD`; the colour goes to
  `$C05B` and `$C05C` and, when it differs from `$6DDB`, into the low half
  of every colour byte in `$F674`-`$FF97` whose high half is not 0. Most
  scripts set `$49FD` from the hour (New Phlan, ECL00 `$9914`: 11 while
  `$49C9` is under 14, else 8, which multicolour cells show as cyan and
  black). Held by `test_graphics.js` with `draw_view` on 1,044 views of
  the 29 maps, by day and by night, with `door_state` (`$1143`) and
  `check_leave_block` (`$10EC`) on the same squares.
- Five wall shapes are drawn on no map: WALLDEF02's first, WALLDEF07's
  third and fourth, WALLDEF08's fifth and WALLDEF17's fifth. Each file is
  loaded by some map's script, and no GEO file of a map that loads it has
  that wall number (`scripts/graphics_data.py`). No script SAVEs to an
  address in `$0400`-`$07FF`, and DUNGEON's only store there is to the
  door bits (`mark_door_side`, `$0F86`).
- Portraits: 41 HEAD and 21 BODY files on the eight sides, each one frame,
  a head 11 by 5 characters and a body 11 by 11. ANIMATE00 draws the body
  (`$8406`), then the head over its top five rows (`$8409`). VIEW shows a
  portrait only while `$49EB` is 0 and bit 7 of `$49FF` is set (resident
  `show_portrait`, `$48A4`); the only script that writes `$49EB` is New
  Phlan's (side 3, ECL00): 0 at its arrival entry (`$9AF8`), 1 on its two
  ways out (`$9945`, `$9BBC`).
- HEAD03 (side 6) is on neither creation list (gen `portrait_heads`,
  `$1347`; `portrait_bodies`, `$133B`), on no one who joins the party and
  in no script. HEAD12, HEAD33, BODY12, BODY1A and BODY23 appear only in the
  creation lists; HEAD44 also as the training hall's THEURGIST.
- No side holds HEAD23 or BODY00. The MAD MAN (head `$23`), the LEVEL 6 MU
  and PRINCESS FATIMA (body 0), who join the party, name them, and so do
  the title's demonstration party's RESTAL, TARRAN and DIANE (body 0).
  Live test below.
- The title is a hires bitmap at `$E000` with its colours at `$DC00`,
  unpacked from TITLEPG (title `title_packed`, `$6F00`).

## Monsters

- A monster is a MON file, a character record of 480 bytes (544 for
  a few) loaded at `$6B00` with its party entry at `$6C00` and its
  items from `$6C20`, by the script command LOAD MONSTER (dungeon
  `cmd_load_monster`, `$1AC6`): file number, count and combat figure.
  170 MON files on the eight sides hold 135 distinct records under 108
  names; a number is the side's own (MON16 is RESTAL on side 1 and a
  GIANT SKELETON on side 4).
- Each monster of one LOAD MONSTER is a copy of the same record and
  takes 1, 1, 2, 2 or 4 combat entries by the low bits of `$6B99`
  (`monster_entry_sizes`, `$1B6F`), the four-slot monster characters 8
  to 11 and at most 64 entries allowing.
- The battle's THAC0, armour class, damage and move of every combatant
  are made by com-prep `$1630`-`$163C`: `strength_index` (resident
  `$3ED2`), `dex_hit_bonus` (com-prep `$1682`) into `$6BEC`, then
  `compute_combat_stats` (resident `$3729`), which adds a readied
  weapon, armour and the strength and dexterity adjustments for a
  monster too (`$6DB1`, the slot, is positive). Run over all 135
  records, the page's `porBattle` matches com-prep's own lines
  (`test_bestiary.js`).
- A fallen monster is worth `$6BF7`/`$6BF8` plus `$6BF9` times its full
  hit points (255 from 256 up) in experience (post-com `$09BA`); its
  money joins the treasure varied to 51-150 % (`vary_amount`, `$0CBD`).
- COMPICnn, the combat figure: a 162-byte block per square, 72 bytes of
  the ready pose's nine characters, 72 of the attacking pose's, then
  nine colours for each pose (bit 3 multicolour); laid out by size as
  com-prep `fit_combatant` (`$0FBD`) reads `size_squares_across`
  (`$1058`) and `size_squares_down` (`$106C`).
- PICnn, a close-up, as ANIMATE00 (one version on every side, loaded
  at `$8400`) decodes it: the frame letters from byte 0 to a zero, a
  delay per letter at `$20` + letter - 'A', repeated `$2C` + 1 times (at
  most 255 jiffies), the window 11 by 11 characters (`$2D`-`$31`), three
  colours at `$34`-`$36`, then per frame two XOR run-length blocks, the
  characters and the colours (from `$3C8` in the buffer). All 65
  decodable close-ups end on their last byte. PIC3A on side 5, and
  PIC64, the same file on every side, do not decode this way.
- SPRITEnn, the 3D-view sprites: a 64-byte header (two shared colours,
  base X and Y per distance at 2-7, picture counts per distance at
  8-10, offsets per picture from `$10`) and up to twelve 64-byte
  pictures, colour and multicolour bit in the last byte; placed by
  dungeon `draw_monster_sprites` (`$28FA`) with `sprite_offsets`
  (`$29FE`) for the place.
- SETUP MONSTER (dungeon `cmd_setup_monster`, `$1F0A`) loads the
  close-up only in a 3D area (`$49E6` not 0); outdoors the monsters
  stand at the middle place.

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
- **The scripts' variables.** The 32 bytes `$4A00`-`$4A1F` are the
  area's own flags, which NEW ECL clears when the party enters another
  area (dungeon `command_handlers`, command 32); from `$4A20` on they
  last the whole game. The city hall's script keeps the council's
  rewards as 26 bytes from `$4AA6`, each 254 when a reward is due and
  255 once paid (ECL08 `$9D12`). *Traced*.
- **The commissions.** The clerk (ECL08 `$A837`-`$A899`) walks a list of
  sixteen entries and offers at most three on a visit; entry 10 only
  goes on to the next. Reaching the end of the list on a visit sets
  `$4ABE` to 254, Cadorna a traitor (`$AF37`); so do the reward for the
  Zhentil mission (`$A2AC`) and the evidence in the castle (ECL04
  `$ADA6`). Valhingen Graveyard is offered before the list once `$4AC1`,
  which some of the rewards count up, reaches 4 and the party strength is
  19 or more, with an enchanted weapon above 36 (`$A584`). *Traced*.
- **No script on the way to the castle reads a commission.** New Phlan
  to the slums, Kuto's Well (west edge), Podol Plaza (north edge),
  Stojanow Gate (north edge, ECL09 `$9C68`), the bailey, the grounds,
  the hedge maze gate (RHODIA, ECL03) and the stairs into the keep
  (ECL05) check passwords, the wagon and gold only. *Traced*.
- **The council's meeting is lost to a clean river.** The eastern
  wilderness's script shows the land recovering the first time the
  party leaves the pyramid's area with `$4AB3` ≥ 254 (ECL1A `$9AEB`),
  setting `$4A9A` to 1 (`$AF2B`) and then 255 (`$AF3B`). `$4A9A` is the
  council's special meeting, offered only while below 254 (ECL08
  `$AE97`) and held at 254 (`$B28B`). *Traced*.
- **Restal's reseal pays the party.** The textile house's script
  (ECL02 `$AE5B`-`$AF0C`) offers to duplicate the seal while `$4A97` is
  255, `$4AC8` is not 0 (the box found, opened or not, or handed to the
  watch) and `$4AB8` is not 255; a yes runs TREASURE 0, 0, 0, 0, 200,
  4, 2, 39 (200 platinum, 4 gems, 2 jewelry, item set 39) and sets
  `$4AC8` to 1, unopened. The box held 450 copper, 20 silver, 400
  platinum, 8 gems, 4 jewelry and set 39. The yes is kept in the area
  flag `$4A17`, so it is offered again on the next visit. *Traced*.
- **The fortune teller.** Murdering her (ECL14 `$A6E7`) sets the slums'
  fights won, `$4A80`, to 0 and the area flag `$4A0B` to 255. The slums'
  patrols stop once `$4A80` reaches 15 (`$9B32`); while `$4A0B` is 255
  they are likelier (`$9B57`) and bigger (`$9B81`) and a rest can be
  broken off (`$9A3C`). She appears while `$4A0B` is 250 or less
  (`$A63A`), so on the next visit. *Traced*.
- **The vampire.** In the crypt (ECL0A `$B12C`) the vampire is MON69
  alone when the coffin was sanctified (`$4A43` = 251) or the pit was
  fought on this visit (`$4A15`), and otherwise MON17 with 15 wolves.
  The two records on disk 2B differ in hit points, 43 and 15 (offsets
  `$76` and `$119`, `$6B76` and `$6C19` once loaded). The coffin can be
  sanctified only before the pit's fight (`$AEFE`). *Traced*.
- **The runes.** PRINT GLYPHS prints a string of character numbers from
  the rune font SECSET10 (the same file on every disk; a character's
  bytes at file offset 2 + (code − `$40`) × 8). The two-wide runes take
  `$40` + 2 × the letter's place for A to O and three more from R on;
  the dwarvish runes take `$79` + the letter's place. The strings are
  HARASH and RHODIA (ECL04 `$A4AA`, `$A4B7`), RHODIA (ECL03 `$AAE7`),
  NOTNOW (ECL17 `$A56E`), and LUX, SAMOSUD and SHESTNI (ECL15 `$AF20`,
  `$AF27`, `$AF36`); the scripts compare the typed answers with the same
  words. *Traced*.
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

## Spells and effects

*Run* below means the routine was run on the kit's 6502 over the
listing's bytes by `test_spells.js`, which holds `spells.html` to it.

- **Timed effects and events.** The engine keeps 64 timed effects, each
  a kind (`$4900`), a holder (`$4940`) and a time (`$4980`), and every
  character's record holds ten kinds that never run out (`$6BAD`-`$6BB6`).
  A battle runs the kinds that care about an event, for the combatant
  concerned (combat-set `run_effects`, `$072E`): event 1 when it is picked
  as a target, 10 at an attack roll, 12 at a saving throw, 9 when an
  effect is about to land, 13 when it goes down, 14 on its turn and 19 at
  the round's end. The routines are in four files loaded at `$A700`:
  SPELLE00 (the combat spells), SPELLE01 and SPELLE02 (the effects) and
  SPELLE04 (the camp's spells, with the camp's table at `$9900`). Each is
  a part. *Traced*.
- **The level drain.** energy_drain (effects-2 `$A7A3`) takes the level
  from the class whose present level cost the most experience
  (`top_part`, `$A8CB`) and falls back on the class drained last
  (`$A92C`, 0 in the file) when none cost anything. A level-1 fighter on
  a fresh file goes to magic-user level 255, loses all its hit points
  and is DEAD (`set_drained`, `$A89C`), with 11,610,464 experience and a
  to-hit byte of 109 (THAC0 −49); a level-1 magic-user is GONE. A
  drained magic-user of levels 1 to 5 or thief of 1 to 4 gets to-hit
  byte 40 (THAC0 20). *Run*. What a raised fighter of magic-user level
  255 can do was not tried.
- **PRAYER.** kind_prayer (effects `$A9B9`) adds one to the roll of a
  combatant whose side differs from the caster's (bit 6 of the effect's
  fourth byte, set by spells `spell_prayer`, `$AC36`) and takes one from
  the caster's own side's: the opposite of the rule book. *Run*.
- **PROTECTION FROM EVIL.** kind_prot_evil (effects `$A794`) checks the
  attacker's alignment (`$6BD8`, 0 LAWFUL GOOD to 8 CHAOTIC EVIL) against
  2, 5 and 9 (`prot_alignments`, `$A7CA`), so it never helps against a
  chaotic evil attacker. *Run*.
- **RESIST COLD.** kind_resist_cold (effects `$A7D0`) returns at once when
  run by an event, which calls it with A = 0 and the Z flag set: the
  damage and the save are unchanged. *Run*.
- **Tyranithraxus's magic resistance.** kind_resist_15 (effects `$AD81`)
  reads a six-byte table for caster levels 0 to 5 (`mr_by_level`,
  `$AD7B`); level 6 reads the next instruction's A9 and the chance is 184
  in 100. The chances for levels 1 to 6 are 60, 55, 50, 45, 40 and 184.
  *Run*.
- **The vampire's ward.** vampire_wards (effects-2 `$AABC`) looks through
  the items of the combatant it runs for, and it runs at event 1 for the
  combatant being picked (combat `pick_target`, `$28AF`), which holds
  kind 126 only when it is the vampire. *Traced*.
- **The mummy.** mummy_fear (effects-2 `$A736`) loads the save byte with
  `A5 21` (LDA `$21`, zero page) at `$A75E`; nothing writes `$21`, so
  only a human, who gets `$40` added, has a save. *Run* (the bytes).
  mummy_rot (`$A9F4`) gives kinds 50 and 57; in camp, kind 50's end
  (camp-spells `rot_ten_days`, `$AD97`) starts it again with time `$CA`
  and heals a hit point, kind 57's (`$AD9F`) starts it again, and no entry
  of `camp_kinds` (`$9AD5`) points at `rot_charisma` (`$ADA4`). *Run*.
- **Kinds no monster carries.** 63 (`kind_displace`, effects `$AA07`), 84
  (`charm_gaze`, effects-2 `$A77F`), 88 (`kind_breath`, effects `$AC60`,
  which casts spell 39, CURE DISEASE's combat record, a lightning bolt of
  the breather's full hit points) and 105 (resist 50) are on none of the
  170 monster files. *Traced* (the files read by `scripts/spells_data.py`).
- **Smaller ones.** SLOW's record has a save byte of 0 (*Run*). The
  combat's POTION OF GIANT STRENGTH (spells `set_strength`, `$A95E`)
  compares only the percentages at strength 18, so it leaves 18/50 at
  18/50 and raises 17 to 21 (*Run*). Camp CURE LIGHT WOUNDS heals 2d4 and
  skips the dying (camp-spells `heal_conditions_camp`, `$9B1E`); REMOVE
  CURSE ends only BESTOW CURSE (`$AC59`); CURSE leaves no one out for
  melee (`side_filter`, `$A8A5`); REDUCE ends an ENLARGE and adds no
  effect of its own (`$A9B7`). *Traced*.

## Items

*Run* below means the routine was run on the kit's 6502 over the
listing's bytes by `test_items.js`, which holds `items.html` to it. The
item lists, the monsters' items and the random table were read from the
disk sides' files by `scripts/items_data.py`.

- **An item** is 16 bytes: type, three name words (printed third, second,
  first; flag bits 2, 1 and 0 hide them until identified), plus, a byte
  added to the saving-throw bonus, flags (bit 7 readied), a byte whose bit
  7 is cursed, weight (2), count, worth (2), and three bytes for charges
  and powers or a scroll's three spells. A power that comes on when the
  item is readied is the last byte with bit 7 set; the byte before it is
  its argument.
- **An item type** is 16 bytes at tables `$7B00`: the place it is readied
  in (0 weapon, 1 shield, 2 armour, 3 gauntlets, 5 necklace, 7 cloak, 8
  boots, 9 ring; 4 and 6 are no item's; `$0A` and up carried), hands,
  damage against large (dice, sides, bonus), attacks in two rounds,
  protection (bit 7, and a base on the 60 scale), damage against small or
  man-sized, range, classes (bits 0 to 3 magic-user, cleric, thief,
  fighter) and flags (bit 0 needs arrows, bit 7 needs quarrels, bit 1
  dexterity to hit, bit 2 strength to hit and damage, bit 3 missile,
  `$10` and up thrown). Types 1 to 47 are named by the word of the same
  number.
- **The trolls' ring.** The hedge maze's troll file (MON1F, disk 3 side
  A) carries a RING OF PROTECTION +2 of type 69, whose protection byte is
  0, so armour_bonus (resident `$37E3`) never adds it; every other ring of
  protection is type 93. *Run*.
- **Bracers.** Type 77 has armour class 10 less the plus. The SHAMAN's
  BRACERS AC2 have plus 6 (AC 4) and are worth 24,000; AL-HYAM DAZID's AC3
  plus 7; random bracers are always AC4, plus 6 (post-com `bracers_ac`,
  `$1F13`). *Run*.
- **Piles.** add_item_weight (resident `$4093`) and item_fits (`$47A1`)
  load the count into X over the weight's high byte, so a pile weighs its
  weight's low byte times its count: 26 HUGE TAPESTRIES (800 each) weigh
  832, 6 LEATHER HOLY SYMBOLS (256 each) weigh 0. *Run*.
- **Type 45, the HEAVY CROSSBOW,** has flags `$0F`: it needs arrows, not
  quarrels (combat `can_strike`, `$1648`), adds strength (resident
  `weapon_bonuses`, `$368F`) and shoots twice a round. The FINE COMPOSITE
  LONG BOW (silver shop, worth 25,000) is type 45. Unused types 94 to 96
  are bows with the same flags. *Run*.
- **Scrolls.** In camp use_scroll_word (camp `$1ED9`) takes one off the
  scroll's middle word and removes the scroll below `$D2` (WITH 1 SPELL);
  the graveyard's CLERICAL SCROLL OF RESTORATION has OF (`$A7`) there and
  is gone after one cast. In combat the scroll goes only when the word
  reaches `$D1` (combat `$2827`). *Run* for the camp. Kovel Mansion's
  CLERICAL SCROLL WITH 3 SPELLS (PRAYER, REMOVE CURSE, ANIMATE DEAD) is
  type 61, for magic-users (resident `ready_item`, `$4630`). *Traced*.
- **Aligned swords.** Kind 132 (effects `kind_item_aligned`, `$AE94`;
  camp-spells `aligned_item`, `$AE5F`): unless the wearer's alignment is
  the low nibble of byte 14, the item comes off and deals the high nibble
  as damage with no save. The graveyard's LONG SWORD +2 (`$F0`: lawful
  good, 15) and the bailey's two LONG SWORD +3 (`$52`: lawful evil, 5) are
  the only items with it. *Run*.
- **Random treasure.** random_base (post-com `$1E98`) rolls d188 against
  36 chances (`item_chance`, `$1F7C`); the CLOAK's chance is 0, so it
  never comes, and the CLERICAL SCROLL, last, takes 184 to 188. Pluses +1
  on 1 to 64 of d100, +2 to 95, +3 above (`random_plus`, `$1EE4`); a
  scroll gets one spell of 1 to 55 (`scroll_spell`, `$1F2F`); arrows and
  quarrels come as 2d6. *Run* for the roll. Type 67, the cloak's, has no
  protection; the LEVEL 6 MU's CLOAK OF DISPLACEMENT is type 67, Mendor's
  library's type 92. *Run*.
- **Shops and treasure.** remove_item (post-com `$11BB`) leaves a shop's
  stock as it is; the Valjevo armoury's TREASURE 33 is offered on every
  visit. Price is worth times count times `$6E6D` over 16 (16 in all four
  New Phlan shops); a sale is half; ID costs 200. magic_exp (`$15A7`)
  gives 400 experience for each point of plus of every item in a won
  battle's treasure, before anything is taken. *Traced*.
- **Unused on the disks.** ITEMFILE04 (disk 1 side B), ITEMFILE17 and
  ITEMFILE1A (disk 2 side A: earlier forms of the graveyard's lists 29
  and 26, with no powers), ITEMFILE33 (disk 2 side B) and ITEMFILE35
  (disk 1 side A, the arms shop's list) are given by no script on their
  side. Item types 60, 64, 65, 66, 80, 81, 83, 88, 89, 94, 95, 96 and 127
  are on no item; the page lists the name words no item has and no code
  writes. *Traced* (the files read by `scripts/items_data.py`).

## Rules

*Run* below means the routine was run on the kit's 6502 over the
listing's bytes by `test_rules.js`, which holds `rules.html` to it.
Rulebook pages are the C64 rulebook's.

- **Rolling.** Each score is the best of six rolls of 3d6 (gen
  `roll_ability`, `$0D1F`), then `adjust_ability` (`$0D4A`) adds the race's
  adjustment (`$0D60`, index 14 × ability + race, +7 for a woman) and holds
  it to `ability_minimum`/`ability_maximum`. Every race but the halfling
  gets at least +1 strength, every race but the elf at least +1
  constitution. 44 % of scores are 15 or more before the adjustment; the
  mean is 14.2. *Run*.
- **First hit points** are `class_hp_dice` dice of `class_hp_sides` raised
  to `class_hp_least` (`$0B4C`-`$0B60`): fighter 1d10 at least 9, cleric
  1d8 at least 7, thief 1d6 at least 5, magic-user 1d4 at least 4;
  classes of several parts roll one die of 9, 8, 7, 6 or 5 sides. Training
  (`train_hp`, `$2037`) rolls each rising part's die, divides by the
  number of parts with a chance rounding, and gives a single-class fighter
  at least 4 (rulebook page 4: 1 to 10). *Run*.
- **Level limits.** `race_level_limit` (`$24A0`) lowers the race's limit
  (`race_level_table`, `$1E60`) by each point of strength (fighter part) or
  intelligence (magic-user part) below 18, at most 2; `level_limits`
  (`$1E21`) also holds it to the hall's 6/6/9/8. Halfling men's strength is
  at most 17 and women's 14, so a halfling fighter stops at 5th (4th for
  strength 16 or less, and for any woman), against the rulebook's 6th
  (page 3). Elf women stop at 5th (rulebook 7th). The half-elf cleric's
  limit is 5. A race whose limit is 0 for a part gets 254 or 255 when the
  score is below 18 (no menu offers such a class). *Run*, through
  `can_train` (`$1BBC`) too.
- **Experience.** `cap_experience` (`$23D4`) cuts experience to one less
  than the next level needs, after every training and when a limit stops
  one; awards are never capped (post-com `add_exp`). A 1st level fighter
  with 100,000 trains to 2nd and keeps 4,000. `prime_bonus` (post-com
  `$15E3`) needs 16 (rulebook page 3: 15) and only for one class; it takes
  a tenth of the low 16 bits and of the high byte apart, so 65,536 gets
  nothing and 100,000 gets 3,446. Two classes get half, three a third.
  *Run*.
- **Saving throws.** `con_save_bonus` (`$2359`) takes constitution × 2 / 7
  off all five saves for dwarves, gnomes and halflings (rulebook page 23:
  dwarves and halflings, against magic). The five are paralysis/poison/
  death, petrification/polymorph, rod/staff/wand, breath, spell. *Run*.
- **Thief skills** (`set_thief_skills`, `$1FEC`): level table plus race,
  no dexterity. Engine code reads only move silently (dungeon
  `cmd_party_surprise`, `$1D88`, where every standing member must roll
  under their own figure, and a non-thief has 0) and open locks (the door
  menu, `$100E`); `effects` `$A76F` reads `$6BA5` as a monster's byte.
  Area scripts read pick pockets (ECL0E, Kovel Mansion), find and remove
  traps (ECL0E; ECL0D, the kobold caves, twice) and climb walls (ECL02,
  the Cadorna Textile House). Hide in shadows, hear noise and read
  languages are read nowhere (decoded scripts of all eight sides and every
  part's code).
- **Cut.** Race 6, the half-orc, has every table and the race menu
  (`race_numbers`, `$121A`) skips it; the cleric/thief is its class only.
  The druid, paladin, ranger, monk and cleric/ranger have minimums,
  alignments (the monk's none), hit dice and money, no race, no level
  tables and no prime ability; resident messages 13 and 14 (their names)
  point at MAGIC-USER. The dungeon's PARTY SURPRISE still sets its first
  result for a ranger (`$1D6B`). *Run* (tables).
- **Ageing.** Starting ages are fixed (`race_ages`, `$1004`); HASTE adds a
  year once per casting in combat (effects `kind_haste`) and to every
  member it reaches in camp (`haste_member`), and the potion of speed
  through the same routine. Age is shown and checked against the race's
  limit; the rulebook's HASTE (page 27) says nothing of it.
- **Training fee.** 1,000 gold at every level (`has_money`, `$1D50`);
  `pay_training` (`$1D63`) turns the rest of the coins into platinum and
  drops change under 1,000 copper; a non-player character pays nothing
  (`$1B84`). 1,234 gold leaves 46 platinum. *Run*.
- **PENDRAGON** (`$01PENDRAGON`) is on the archive.org copy of disk 2
  side A (GAME DISK #3) only: the C64 Preservation Project's G64s of that
  side, v1.0 and v1.1, end with HEAD20 and 3 blocks free, and PENDRAGON
  is the last directory entry, 3 blocks from track 35. Saving and ADD
  CHARACTER use whatever disk is in the drive. *Live*: with that copy in
  the drive, ADD CHARACTER listed him and he joined (AC 7, 13 HP).

## Combat

*Run* below means the routine was run on the kit's 6502 over the
listing's bytes by `test_combat.js`, which holds `combat.html` to it.

- **Morale.** combat `morale` (`$20C1`) runs before each turn of a
  combatant the computer runs (combat-set `ai_turn`, `$678D`). A turned
  undead flees. Otherwise `hurt_check` (`$211C`) takes, for an NPC or
  monster (`$6BB8` bit 7), the figure 100 less twice `$6BB8`'s low bits,
  through event 17, and the combatant is hurt when its hit points are at
  or below that share of its full hit points. A hurt combatant of side 0
  flees. One of side 1 compares the monsters' losses (`$2B68`, 0 to 100
  in fives, through event 17) with the script's morale (`$6DC6`): above
  it, one as fast as the party's fastest (`$2B69`) flees; a slower one
  SURRENDERS (message `$3F`, condition `$85`) with intelligence 5 or
  more, and fights on below. *Run*.
- **BLESS and CURSE** answer event 17: 5 off the figure, at least 0, or
  5 on (effects `kind_bless` `$A73F`, `kind_curse` `$A74F`). *Run*. No
  code that moves items or money writes `$6BB8`; ADD NPC (dungeon
  `$2756`), ANIMATE DEAD and GEN's editors do. *Traced*.
- **Monster files.** `$6BB8` is `$FF` (figure 102, always hurt) in all
  but five files: HASSAD, the SHAMAN and one file each of the EFREETI,
  NOMAD and 4TH LVL FIGHTER hold `$B2` (figure 0, never hurt). The
  scripts set `$6DC6` to 100 or 101 for the undead fights, and Sokal
  Keep (ECL15 on disk 2 side B) to 99 for its skeletons, zombies and
  FERRAN MARTINEZ, from the table at `$AF08` of its script: losses reach
  100 only with under a twentieth of the side's hit points left. *Traced*
  (the files).
- **NPCs.** ADD NPC's second operand, halved, is `$6BB8`'s low bits. The
  training hall's eight hirelings (ECL0B on disk 2 side A) get 50 + 5 ×
  their place in its list: ACOLYTE 50 (runs at 50 %) to THEURGIST 85
  (16 %). DIRTEN and the LEVEL 6 MU join with 99 (2 %); GENHEERIS,
  PRINCESS FATIMA and SKULLCRUSHER with 100 (never); the MAD MAN with 0
  (always). The title demonstration's party joins with 100. *Run* for
  the figures, *traced* for the operands.
- **ANIMATE DEAD** (spells `$AB76`, camp-spells `$A9FA`) writes `$B2` to
  `$6BB8` for one already an NPC or monster, and ORs `$FE` into a party
  member's (0, or 1 once GEN's editors have written it), a figure of 104
  or 102: the
  zombie of a party member flees at its first turn in every fight.
  *Run* for the morale, *traced* for the spell.
- **Surrender and experience.** post-com (`$0990`) counts every monster
  with condition bit 7 that is not `$86` (fled): one that surrendered
  (`$85`) gives its experience. *Traced*.
- **Turning.** `turn_roll` (`$252B`) with tables `$7AD7`, `$7AE4`,
  `$7AF1` and GEN's `cleric_figures` (`$239A`: 1, 2, 3, 5, 6, 7 for
  levels 1 to 6). A 6th level cleric destroys skeletons and zombies.
  *Run*. A destroyed undead gets report_msg `$12`, SPELLN00 string `$4B`,
  IS CURSED (combat `$24E2`); a turned one IS TURNED (`$24F9`). SPELLN00
  has no message with DESTR in it. *Run* for the strings.
- **Outdoor start squares.** com-prep `$15C2` stores the monsters' four
  by X (`$9D` at `$15C5`). *Run* for each facing; *live*, below.
- **Long shots.** combat-set `range_penalty` (`$695D`) reads `$0364`,
  which `missile_leg` (`$6652`) sets to 128: the penalty starts beyond 42
  squares. The longest range of a weapon type any item has is 22; type
  127, on no item, has 60. combat `$11F1` adds the penalty to the AC
  figure, as a backstab's `$FE` (`$11F9`), which makes a hit easier.
  *Run*; *live*, below.
- **Surprise.** `surprise_round` (`$15D9`) takes 6 from the surprised
  side's initiative in the first round, down to 0, which gets no turn.
  Initiative is d6 + `$6BEC`, at least 1 (`$0893`). `$6BEC` is written
  only by com-prep (`$1639`, `dex_hit_bonus` `$1682`: +1 at 16, +2 at
  17, +3 at 18 to 20), for every combatant. *Run*.
- **VIEW and dexterity.** Until a character's first fight `$6BEC` is 0,
  so VIEW's THAC0 with a bow leaves dexterity out: PENDRAGON's composite
  long bow reads 20 and is 18 in a fight. *Run* (the Items tab's sheet).
- **The computer's targets.** combat-set `ai_target` (`$670A`) searches
  again with the sight allowance `$034E` at `$FF` when it finds no enemy
  in sight. A pure magic-user (`$6BEB` = 1) that is not fleeing does not
  move; one fleeing heads by the party's facing (`$49C2`), turned round
  for side 0 (`$6884`). *Traced*.

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

A second sample, seed 20261108, was drawn from the 454 comments of the
four spell parts alone (spells, effects, effects-2, camp-spells), 60 of
them, and checked by one checker on claude-opus-5-5 with the same brief.
All eight verdicts of wrong held, every one wrong in a detail: 8 of 60,
13.3 % (95 % interval 6.9 % to 24.2 %), over the mark. camp-spells
`$A79F` said an effect of the same kind is ended and the new one added;
the new one is added only when the old one was ended. camp-spells
`$ADDC` said a kind goes into the first empty place; the list is searched
from the last place down, the check for a duplicate covers only the
places above, and a full list gets an effect that lasts for ever. effects
`$A700` named the wrong users of cancel_kind; `$AB01` called `$A680` a
remembered target where its bit 7 is the turned-undead mark; `$AC3C`
called `$0DC7` a redraw where it is report_result's end. spells `$A700`
said a cancel aborts the spell; it does only when nothing was picked.
spells `$A95E` missed that at strength 18 only the percentages are
compared. spells `$ABB9` missed that spell_effect keeps six bits of the
time. All eight were corrected, and with them the three comments that
shared their belief (combat-set `give_kind`, `$9ACD`; spells `$A700`'s
second line; spells `$AD4A`). While the tab was built, three comments
that called the ten bytes at `$6BAD` item numbers were corrected to
effect kinds (resident `has_item_type`, `$4027`, and `$6BAD`; gen
`$13DD`).

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
- PENDRAGON from the game disk (10 November 2026): from the party menu
  with the six pre-rolled characters, one removed to a copy of the save
  disk, then ADD CHARACTER TO PARTY with a copy of disk 2 side A in the
  drive. The list showed PENDRAGON and EXIT; he joined the party with AC 7
  and 13 HP.
- Long shots (10 November 2026): from `por_combat_goblins`, SHARA's
  long bow at HOGARTH, stopped at combat-set `$695D`: `$0364` was 128,
  the distance (`$034F`) 2, `$2B42` 1 and `aim_range` (`$2B50`) 22.
- Outdoor start squares (10 November 2026): from
  `por_encounter_goblins` with disk 1 side B attached, `$49E6` set to 0
  at com-prep `$0ABD` and the facing set in A at `$15A3`, for each
  facing, then again with `$99` at `$15C5`. The six characters and twelve
  goblins started 6, 5, 16 and 5 squares apart (nearest to nearest) for
  north, east, south and west, and 11, 10, 11 and 11 with the store by
  Y; as the game has it the goblins stood around the middle of the 56 by
  26 field for north, east and west.
- A portrait with no file (10 November 2026): from `por_phlan_party` with
  disk 2 side A attached, ZARRADA's body set to 0 (`$4DFF` and `$6BFF`),
  then VIEW for her. The screen read INSERT SIDE # 3, AND PRESS ANY KEY.
  and asked again after each key, with side 3 in the drive and with each
  of the other seven. The same with her head set to `$23` (`$4DFE` and
  `$6BFE`).
