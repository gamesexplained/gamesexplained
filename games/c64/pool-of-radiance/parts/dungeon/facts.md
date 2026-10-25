# The adventure module — verified technical facts

DUNGEON, module 1: moving through towns, dungeons and the wilderness,
the Adventure Menu, and the interpreter that runs each area's script.
Every address here is the dungeon part's. Unless marked *live*, a fact
comes from the code in `phlan_party`. Live tests are listed in the game's
own `facts.md`.

## The Adventure Menu

- MOVE VIEW CAST AREA ENCAMP SEARCH LOOK (`adventure_menu`, `$086D`),
  each command's routine from `menu_handlers` (`$08B7`). AREA is left out
  where the area forbids its map (`show_menu_bar`, `$09B5`, by `$49FB`).
- MOVE in a 3D area (`move_command`, `$08F4`): I steps forward, J and K
  turn, M steps back by turning round, stepping and turning again. A step
  that is blocked plays sound 9. The square's script runs again after
  every step, blocked or not, but not after a turn.
- A step takes one minute, ten with Search on (`pass_step_time`,
  `$08D4`). LOOK (`look_command`, `$111F`) takes ten minutes and runs the
  square's script with Search on.
- Outdoors MOVE takes the eight directions from the keys 1 to 8 or the
  joystick, and each move puts twelve hours on the clock
  (`overland_move`, `$0ABA`; `add_half_day`, `$1241`).
- AREA (`area_command`, `$0CFD`) draws 11 by 11 of the block's squares
  round the party, its north and east walls only (`draw_area_map`,
  `$1266`), and blinks the party's square.
- The status line shows the facing, the time and, where the area allows,
  the party's square (`show_status`, `$09DE`).

## Doors

- A step into a wall reads the door bits on that side (`open_door`,
  `$0E64`; `door_state`, `$1143`): 0 a wall, 1 a door that opens, 2 or 3
  a locked door, and the door menu BASH PICKLOCK KNOCK DISPEL QUIT.
- PICKLOCK tries the party's best open-locks figure against a roll of 1
  to 100, never on a type 2 door (`$0EB7`). BASH rolls 1 to 24 against
  `bash_chances` (`$1078`) by the best strength for a type 2 door, and 1
  to 12 against `bash_hard_chances` (`$1097`) for a type 3, which only
  strength 18/91 or more can open. KNOCK always opens a door; DISPEL opens
  a type 3 door half the time and never a type 2 (`$0F5A`).
- A failed attempt is remembered with the door's square, the area and the
  facing (`remember_door`, `$0FAF`), so the same party cannot simply try
  the same door again with the same figures.
- An opened door is marked open on both sides of the wall
  (`mark_door_open`, `$0F76`).

## The scripts

- `run_script` (`$1581`) fetches each command byte and calls its routine
  from `command_handlers` (`$15A9`): 62 commands, from EXIT, GOTO and
  GOSUB to the encounter menu, combat, treasure, shops and the clock.
- An operand is a kind byte and its value (`get_operand`, `$1663`): 0 a
  byte, 1 the byte at an address, 2 a 16-bit value, 3 to `$7F` the 16-bit
  value at an address, `$80` a packed string, and `$81` and up an address
  itself.
- A packed string is a count of bytes read as six-bit characters, 1 to
  31 the letters (`$150A`).
- `operand_counts` (`$1625`) gives SETUP MONSTER 2 operands, ENCOUNTER
  MENU 13 and ADD NPC 1, one fewer than their routines read, so any of
  them would be skipped wrongly after a false IF. In the 32 files named ECL
  on the disks, decoded command by command from their start (the How it
  works page's decoder, held to `get_operand` by `test_widgets.js`), none
  of the three follows an IF; the decoding stops at the first table some
  files keep among their commands, so the rest of those files is
  unchecked.
- ENCOUNTER MENU (`cmd_encounter_menu`, `$21FB`) shows COMBAT WAIT FLEE
  ADVANCE PARLAY and settles the outcome from the party's choice and the
  monsters' answer given by the script (`party_choice_bits`, `$2304`;
  `monster_choice_bits`, `$2309`).
- PARLAY asks who speaks and takes that member's charisma
  (`cmd_parlay`, `$2427`), then HAUGHTY SLY NICE MEEK ABUSIVE.
- DAMAGE (`cmd_damage`, `$24CA`) strikes random members or the member in
  hand; with no one left standing it prints DEATH FOR ALL and the program
  waits for ever at `$2525`.

## The clock and the effects

- `add_time_unit` (`$0DEC`) moves the clock and passes every figure to
  `count_step` (tables `$7A5F`), which counts the days gone by.
- `age_effects` (`$0E0D`) ages the timed effects of the highest clock
  figure that changed only, so on a minute that carries into the ten
  minutes the effects counted in minutes miss their tick.
