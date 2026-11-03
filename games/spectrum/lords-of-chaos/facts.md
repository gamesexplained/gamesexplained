# Lords of Chaos — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is five parts (`orientation.md`, "The parts"). An address
below is the engine's unless a part is named: the engine stays in memory
from `$606E` to `$D002`, and the designer or one of the three scenarios
fills `$D003` up. The scenarios share one layout, so a scenario address
with no number holds in all three.

## Build

No build identifier, version string or credit is stored in any part: the
string sweep (`kit/cpu/strings.py`, every part) finds only the game's
own words. The engine's wizard records still hold the names the authors
were testing with when the tape was made (wizard_1 to wizard_4: ROGUE,
JOE BLOGGS, WOPPER ZAP, TORQUEMADA), with no level, so every slot counts
as empty.

## Memory layout

| Thing | Where |
|---|---|
| The loading screen, left on the screen until the first panel draws over it | `$4000`-`$5AFF` |
| The engine's variables | `$5B00`-`$5B59` |
| The object table: 145 entries of six bytes (row, column, type, terrain under, carrier, one more byte); entries 0 to 3 are the four wizards | `$5B5A`-`$5EBF` |
| The creature records: 86 of five bytes (action points, stamina, constitution, potion, flags with the owner in the low three bits) | `$5EC0`-`$606D` |
| The engine's code and tables | `$606E`-`$CEE9` |
| The four wizard records, seventy bytes each (wizard_1 ...) | `$CEEA`-`$D001` |
| A scenario, the designer, or a saved game | `$D003`-`$FFFF` (designer: `$D003`-`$E220`) |
| In play: working storage over the scenario's placement tables | scenario `$D0C8`-`$D207` |
| In play: the start-up routine's space, then the IM 2 table, 257 bytes of `$FF` | scenario `$FE00`-`$FF00` |
| In play: more engine variables, and the stack from `$FFF3` down | scenario `$FF01`-`$FFF3` |
| The interrupt's jump and vector | scenario `$FFF4` (`JP interrupt`), `$FFFF` (`$18`) |

A scenario file is the whole of `$D003`-`$FFFF`: a header of pointers,
hooks and settings (`$D003`-`$D0C7`), the start-up placement tables,
the terrain records (`$D208`, five bytes for each of 78 terrains), the
terrain flags (`$D38E`), the computer's spell priorities (`$D3DC`) and
object worths, then the scenario's own tables, code, map, graphics and
character sets (scenario-1's `type_gold_dragon` and on). A saved game
is the same block of memory under another extension (save_game), with
the object table and creature records saved before it.

## Interrupts and timing

- In play the processor is in interrupt mode 2 with `I` = `$FE`
  (game_turn_loop). start_game fills `$FE00`-`$FF00` with `$FF`, so
  every interrupt reads the vector `$FFFF`, where the scenario's file
  holds `$18`, a `JR`. Its offset is the ROM's first byte, `$F3`, so it
  lands on `$FFF4`, `JP $A879` (interrupt). The start-up code that
  scattered the objects lived in the same bytes a moment before
  (scenario `scatter_objects`).
- The handler (interrupt) runs every frame; its main work
  (interrupt_work) on every second one, when frame_toggle flips to 0:
  the animated things count down and change frame, the cursor blinks,
  the flashing colour moves on, and the bits of `$D0DF` ask for the map
  window, the pictures, the icons or the menu bar to be redrawn. The
  bars slide every frame while bit 4 of `$D0DF` is set (slide_bars).
- The file panels and the designer run with the interrupts off, in
  mode 1 (file_panel).
- Waits are counted in polls of the controls or empty loops (delay_2
  and its relatives, key_repeat), not in frames.

## Random numbers

random_below ex-ors the refresh register `R` with three bytes 256 apart
at each of two pointers that walk through memory a byte a call
(`$606F`, `$6071`), and with the byte at `$FFF8` that every poll of the
controls counts on (wait_release, wait_press, wait_fire), and draws
again until the result is below the limit in `$5B22`. `R` counts the
instructions the processor has run, so every random number depends on
exactly how long everything before it took, and on how long the player
held a key. A limit of 0 never returns: no byte is below it. strike_hit
asks for a number below twice the attacker's combat plus 2 (`$FF62`,
255 from a combat of 127 up), which is 0 for a combat of 255; whether a
creature's combat can reach 255 in play is unknown.

## Controls

control_type, chosen on SELECT CONTROLS: 0 keyboard, 1 Kempston, 2
Sinclair (Interface 2). read_controls leaves five bits in `$5B13`, 0
while pressed: bit 0 fire, 1 up, 2 down, 3 right, 4 left.

- Keyboard (read_keyboard): Q up, A down, O left, P right, SPACE fire.
- Kempston (read_kempston): port `$1F`, inverted and reordered.
- Sinclair (read_sinclair): half-rows `$EF` (6 to 0) and `$F7` (1 to 5),
  combined, so either joystick of an Interface 2 works.
- Typing a file name (ask_file_name) reads the whole keyboard through
  the ROM's KEY-SCAN; ENTER ends it and 0 rubs out. HOW MANY PLAYERS?
  (start_game) reads the same way.

## The I/O ports

Every `IN` and `OUT` in the five parts, from their disassemblies:

| Port | Instruction | Where | What |
|---|---|---|---|
| `$EFFE`, `$F7FE` | `IN A,($FE)` | read_sinclair | the Sinclair joystick's half-rows |
| `$1F` | `IN A,($1F)` | read_kempston | the Kempston joystick |
| `$FDFE`, `$FBFE`, `$DFFE`, `$7FFE` | `IN A,(C)` | read_keyboard | A, Q, P and O, SPACE |
| `$7FFE` | `OUT (C),A`, `IN A,(C)` | tape_check | border black, then SPACE, which abandons a tape operation |
| `$FE` | `OUT ($FE),A` | play_sound | the beeper, bit 4 flipped for each click |
| `$FE` | `OUT ($FE),A` | start_of_turn, call_ld_bytes, designer `character_screen` | the border: black, white for the tape |
| `$FE` | `OUT ($FE),A` | what_is_at (yellow), divide (magenta), computer_move_creature (black, red), find_in_list (blue), add_to_wizard_list (yellow) | the authors' checks: the border changes colour when something that should not happen does |

No instruction writes the 128's paging port (`$7FFD`) or its sound
chip: the game is a 48K program and has no AY music.

## Copies of the ROM in the image

`kit/spectrum/romcopy.py` on each part's snapshot:

- `$CDD9`-`$CDFF` (key_table) is the ROM's main key table
  (`$0205`-`$022B`) with SYMBOL SHIFT (`$0E`) and ENTER (`$0D`) made 0.
  ask_file_name and start_game turn KEY-SCAN's key number into a
  character through it. It is left out of the engine's listing.
- `$FF58`-`$FFF3` in scenario 1's file, and `$FFD3`-`$FFF3` in scenarios
  2 and 3, are pieces of the ROM's character set (`$3E08`-`$3EA3`,
  `$3E83`-`$3EA3`): bytes that happened to be in memory when the files
  were saved. Nothing reads them; in play the engine's variables and
  stack take the space. They are left out of the scenarios' listings.
- The engine and designer snapshots hold another such piece at
  `$FF31`-`$FFFF`, outside both parts' ranges.

## Text

Letters are stored as ASCII. There is no private alphabet; three fonts
draw them:

| Font | Where | Used by |
|---|---|---|
| The ROM's character set, bold (each line ored with itself a pixel to the right) | `$3C00` | the scenario's messages (print_scenario_text), single or double height |
| The game's own set, 49 characters | game_font, `$9531`-`$96B8` | frames, the information display's icons and bars, the menu bar (print_panel_text, draw_frame) |
| The scenario's small font | the scenario's `$D009` pointer | the big map's squares (big_map) |

A message is a length byte, then word numbers and control codes; a word
is a length byte then characters (print_message, find_entry). Codes:
`$FF` a new line (two lines in double height), `$FE` a colour (one byte,
two in double height), `$FD` and `$FC` turn a gap after each word on and
off (word_gap), `$FB` a position (row and column). `$FA` inside a word
is skipped when printing and stands for a space in a name
(save_wizard_menu). The scenario's messages and words are its own
(`$D00B`, `$D00D`): message n + 1 names thing n, so the same table names
the terrains, objects and creatures, and a scenario can rename anything.
The players' names live in the scenario's word table, eleven bytes a
player from the `$D03A` pointer, so that messages can print them
(copy_wizard_name). The engine's own six messages and fourteen words
(panel_messages, panel_words) are rows of game_font characters with
colours, which draw the information display.

## Graphics

- **The map window** is seven squares by seven (draw_map), each square a
  block of three by three characters (draw_block): 168 pixels square at
  the top left. A map byte below `$50` is terrain, `$50` to `$8B` an
  object, `$8C` up a creature; each value has a five-byte entry in the
  scenario's things table (thing_graphic): character set, graphic,
  colour set, frames left, next frame. A graphic is nine character
  numbers, a colour set nine attributes.
- **Four character sets**, named by the scenario's table at `$D07A`
  (charset_table): sets 0 and 1 are in the engine (charset_0 at `$B646`,
  charset_1 at `$BE3C`, 245 characters), sets 2 and 3 in each scenario.
- **Animation** is the interrupt's: on every second frame, 170 things,
  each whose count is not `$FF` counting down and at 0 taking graphic,
  colour set, count and next frame from the scenario's frame table
  (interrupt_work `$A8B2`-`$A8CF`, next_frame). The animation belongs to
  the map byte, so every creature of one type moves in step. The page's
  port of the loop matches the game's on 300 working frames in each
  scenario (test_graphics.js).
- **The cursor** blinks, three calls on, two off (blink_cursor).
  draw_map draws it in place of the square under it, from charset_0,
  graphic in `$FF86` and colour set in `$FF87`: graphic 1 in colour set
  0 for looking round (reset_ff86, `$78A8`), 2 in set 3 with a creature
  on the ground selected (land `$6E45`, make_selected `$901A`), 4 in set
  2 in the air (fly `$6E80`, make_selected `$9033`), 3 in set 1 choosing
  a target (pick_target `$7209`). No scenario's thing uses graphics 1 to
  4.
- **Two things are effects.** show_hit (`$798B`) puts `$4E` on a wounded
  creature's square, graphics 89 and 90 taking turns. `$4F`, the
  sparkle, stands on frame 168 (graphic 0, leading back to itself) until
  the game writes `$A5` into its next frame (show_hit `$79DF` when the
  creature died; summon_display `$8447` after a spell that sets `$5B25`:
  a summons, a brew, MAGIC SHIELD); it then shows frames 165 to 167
  (graphics 86 to 88, one working frame each) and the game waits until
  its next frame reads `$A8`. No entry in the things table leads to
  frames 165 to 167 on its own.
- **The burst** (draw_hit `$AEC2`) draws graphics `$53` to `$55` in
  colour set 0 from charset_1, at the square's place in the window, a
  step of sound 8 after each, when a blow lands (strike_hit), a missile
  reaches its target (draw_missile), a creature attacks terrain
  (attack_terrain) and MAGIC ATTACK kills (magic_attack). From each
  graphic's sound to the next, and from the last to the return: 139,601,
  213,226 and 196,667 T-states on the kit's Z80 with no contention,
  about 159 ms in all. In scenarios 1 and 2 no thing uses those
  graphics; scenario 3's map byte 8, unnamed, cycles through them in
  colour sets 5, 4 and 8.
- **A wizard's death** (wizard_gone `$8C0C`): with the interrupts off,
  the window centres on its square and death_animation_frame (`$8C6A`)
  runs seven times with `$FF07` = 0 to 6, each ten steps: the wizard's
  graphic as it stands, in colour set `$FF07`, at the eight points k
  characters from the middle (k = 0 to 9), a sound step after each, the
  figures left in place; then draw_map. 70 steps, about 4.9 million
  T-states, 1.4 s.
- **Unused graphics.** Every graphic of scenario 1's table is shown by a
  thing, a frame, the cursor or the burst; scenario 2 leaves graphics
  113 and 164 unshown, scenario 3 graphic 145, and scenario 3's frame
  143 (graphic 137, colour set 41, the same as frame 141) is reached by
  nothing.
- **Missiles** fly a pixel line at a time from the selected creature to
  the target, with a tail (draw_missile, missile_step), in one of the
  two shapes in shapes (`$AD4E`): a cross of five pixels and a star of
  thirteen, plotted by draw_shape where both coordinates are below
  `$A8`; a missile that leaves the window moves the view seven squares
  (scroll_down and its three relatives). set_missile copies one of seven
  eight-byte styles from missile_styles (`$B60E`) to `$FF5D` on: shape,
  pixels a frame, tail, reach, attribute, combat, magic, sound. Style 0
  is the dragons' flame ($90 to $92), 1 an arrow from a bow, 2 an arrow
  from anything else, 3 a thrown object, 4 draw_spell_bolt, 5
  magic_bolt_at, 6 magic_lightning_at.
- **The information display** on the right: eight pictures (the terrain,
  the creature, six objects; pictures), five flashing icons (undead,
  flying, mount, fatal wound, invisible) and five bars (action points,
  stamina, constitution, combat, defence) that slide a pixel a frame
  toward their values (slide_bars, at most `$5F`).
- **The big map** draws 23 rows of 31 squares, one character each, in
  the scenario's small font (big_map).

## Sound

The beeper only. sounds holds sixteen sounds of eight bytes: a number of
groups, the repeats of each group, and three notes, each a delay and how
much the delay changes after each group (set_sound). play_sound clicks
the speaker (bit 4 of port `$FE`) after each note's delay loop. A sound
started while the map is drawn gets a step after each row (draw_map,
sound_running), so drawing and sound share the time. Nothing plays in a
hidden turn (`$D066`, start_sound). There is no music.

## Mechanics

### Turns

game_turn_loop: the independent creatures move first (player 0,
computer_turn), then each player in turn; a player with no creature left
is skipped, and player 2 in a game against the computer is played by
computer_turn too. After each player the per-turn upkeep runs
(clear_map_things, spread_magic, destroy_lost_objects). When every
player has had a turn the turn number (`$D065`) goes up and the end of
turn menu offers CONTINUE, SAVE GAME and ABANDON (end_of_turn_menu).

start_of_turn, for each of the player's creatures: its potion counts
down; on the ground it takes damage from tangle vine (8), another
player's magic fire or the wild fire (that fire's strength,
fire_strength) or another player's gooey blob (blob_strength), plus
twice its fatal wound. A survivor gets its action points back (halved
when its stamina is under a sixth of its most, divided by the number
of times its constitution goes into its most; a flyer first pays
stamina) and a sixth
of its most stamina (half under a speed or super potion). A wizard's
player gains a 25th of the starting mana.

### Movement

classify_step decides what a step to a neighbouring square means
(`$FF8F`): 4 an enemy there (3 when the creature shares its own square
with a partner, another creature riding nothing), 0 a square
it cannot enter, 1 too few action points, 2 too little stamina, 5 free,
6 free but engaged, 7 just dismounted in the air. The cost is the
terrain's (byte 0 of its record, `$FF` impassable), half as much again
on a diagonal, and 4 for a flyer, a ghost (`$A5`), or a creature whose
type flags match the terrain's (a swimmer in water). A step costs its
cost in action points and half of it in stamina (move_selected). The
scenario's hook at `$D01E` may change the class. An engaged creature
(next to an enemy at its height; update_view) cannot step to a free
square.

Distances are in half squares: twice the longer of the row and column
differences plus the shorter, so a straight step is 2 and a diagonal 3
(distance). The map wraps at its edges (cursor_up and its relatives,
line_step, wrap_coordinate).

### Sight

work_out_sight: the reach is 19 half squares on the ground and 23 in
the air, nine and eleven squares in a straight line. A line is traced
over the map (trace_line), blocked by a terrain whose flags (terrain
flags, `$D38E`) have bit 0 for a viewer on the ground or bit 4 in the
air. A creature next to the viewer is always seen; an invisible enemy
never, except under the magic eye (see_entry).

### Combat

attack: 8 action points and 8 stamina. strike: damage is a random number
below twice the attacker's combat plus 2, less the defender's defence;
above 0 it comes off constitution (damage_creature). The defender
strikes back if it has 4 action points and 4 stamina left. A blow of
more than a quarter of the starting constitution adds one to the fatal
wound (top three bits of byte 4 of the record, at most 7), which costs
twice its value in constitution every turn. Undead take damage only from
magic: an undead attacker, a magic weapon (`$60`-`$66` but the magic
bow `$63`) or a spell (strike_hit).

Combat and defence (load_figures) are the type's, plus 20 combat under
a strength or super potion and 25 defence under a protection or super
potion, plus the weapon in use's combat and the best defence among the
weapons carried, plus four times a wizard's magic shield and 12; both
are divided by the number of times the creature's constitution goes
into its most, rounded down: whole above half, halved at half or below,
a third at a third or below. Action points at the start of a turn are
divided the same way (start_of_turn).

The victor's player gets the dead creature's victory points (byte 10 of
its type), halved unless a wizard struck the blow (damage_creature).

### Objects

A creature carries what its type's carry limit allows by weight
(pick_up, carried_weight); the last picked up is in use, CHANGE picks
another. Keys open doors and chests (use_square). Objects lying in
water, or in fire unless fireproof, are destroyed at the end of each
turn (destroy_lost_objects).

### Spells

spell_cost: the base cost from spell_base_costs times the level plus
one. Casting needs 8 action points and the mana; it lowers the spell's
current level by one (pay_for_spell). Summons place as many creatures as
the level, on free squares round the wizard (summon_creature). Potions
need an empty cauldron, the ingredient (potion_ingredients) and the
wizard on one square, and give the level plus 3 gulps (brew_with).
Dragons need the dragon potion in a cauldron, brewed from dragon herb
(summon_dragon). Magic fire and gooey blob spread and die back each turn
by the caster's strength for them (spread_magic). The ranges are twice
the level plus 7 for most spells (pick_spell_target), three times the
level plus 10 for magic eye, twice the level plus 30 for teleport.

### The portal and the end

set_up_game picks the portal's turn, `$D040` plus a random number below
`$D041`. On that turn the portal (`$35`) opens on one of the scenario's
portal squares (portal_turn) for `$D042` turns. A wizard who steps onto
it leaves with the worth of the objects it carries and the escape bonus
added to its victory points (step_effects). When the portal closes, or
every wizard is gone, game_over names the winner by final score. A
designed wizard who wins a game against the computer with a score keeps
it and goes up a level.

### The computer's play

computer_turn moves each of the computer's creatures in turn, up to 50
steps each (computer_move_creature): drink, eat, use, pick up, cast,
shoot, hunt, flee, follow its route. Routes and waypoints are the
scenario's (`$D00F`, `$D013`); a creature joins a route that suits its
type (add_to_wizard_list), and some guard the wizard (byte 8 of the
type). A creature moves on to its route's next waypoint only when it
stands on the one it is heading for (computer_choose_target), and
waypoint_square takes a waypoint's number without checking it against
the table. Independent creatures follow the scenario's own orders
(`$D015`), and some wait until a trip square wakes them. A trip square
(`$D017`) wakes its group when the square changes: a door there is
unlocked, opened or closed (use_square), a chest there is opened, or
its terrain is set by anything else (set_terrain_under, which every
change of terrain goes through). Stepping onto it does nothing. The
computer wizard tries spells by the scenario's priorities
(computer_cast).

## Data tables

| Table | Where | Layout |
|---|---|---|
| Creature types (from `$90`) | scenario, `$D003` pointer | 12 bytes: ground and flying action points, stamina, constitution, combat, defence, magic resistance, carry limit, bodyguard chance, potion consumption, victory points, flags |
| Wizard types (`$8C`-`$8F`) | the 23 bytes from byte 47 of each wizard record | the same twelve figures (type_record) |
| Object types (`$50`-`$83`) | scenario, `$D005` pointer | 6 bytes: worth, weight, two figures (combat and defence added by a weapon; healing and mana from food), thrown damage, flags (bit 0 weapon, bit 2 edible, bit 3 fireproof) |
| Terrains (0 to 77) | scenario `$D208` | 5 bytes: step cost (`$FF` impassable), toughness, vine and flood resistance, blob and fire susceptibility, flags (top two bits: what it breaks into) |
| Terrain flags | scenario `$D38E` | one byte a terrain: what blocks sight on the ground and in the air, cover, what lightning cannot target |
| Spell costs | spell_base_costs, `$B4BE` | 45 base costs |
| Sounds | sounds, `$C7B0` | 16 sounds of 8 bytes |
| Missile styles | missile_styles, `$B60E` | 8 bytes: shape, speed, tail, reach, attribute, combat, magic, sound |

## Corner cases

- find_file compares only the first character of a file name (`B` is
  loaded with 12 and never counted down), so LOAD takes the first file
  on the tape whose name starts with the same character, whatever its
  extension.
- interrupt_work restores its drawing state with a read where it means a
  write (`$A914`), so a block the main program is drawing when the
  interrupt comes takes the rest of its attributes from where the
  interrupt's drawing left the pointer.
- computer_find_prey lets a creature chase an undead enemy while it
  holds a cauldron (`$67` is inside its range), and computer_decide_attack
  then refuses the attack.
- The scenarios' spell routines enter magic_lightning past its refusal
  of the computer, so the computer's wizard casts the one spell the
  engine's own menu forbids it.
- debug_probe and unused_trace_20, unused_trace_40 are code nothing
  calls.
- Scenario 2's routes 0, 2 and 6, three of the seven the computer's
  creatures choose from, name waypoint 28, and its table (`$D4AD`)
  holds waypoints 0 to 27. waypoint_square reads the first two bytes of
  the independent creatures' orders after it, row 8, column 7, which is
  ROCK WALL (step cost 255). Only a ghost (`$A5`), which classify_step
  charges 4 for any square, could stand there, so a creature on those
  routes never passes that waypoint.
- A step costs 254 on scenario 3's terrain 9, the squares four of its
  teleports lead to; a teleport moves the creature there at no cost
  (floor_traps sets the cost, `$FF8E`, to 0).
- list_objects_at lists at most ten of the objects lying on a square
  (`$6819`), and computer_pick_up looks for the type it wants in that
  list with no end to the search (`$A143`, every second byte from
  `$D1D5`). When a computer creature wants an object past the tenth, the
  search runs on through memory to the first of those bytes that holds
  the type, takes the byte before it as the object's entry, sets bit 7
  of that entry's byte 3 and writes the creature into its byte 4. Seen
  on the kit's 48K in a game of scenario 1 against the computer (the
  port's lockstep from the hand-over, seed 1), and checked in ZEsarUX
  from the same machine: the computer's wizard, TORQUEMADA (entry 1),
  stood at row 24, column 17 on a pile of objects and wanted a MAGIC
  MUSHROOM, type `$82` (entry `$2C`). In game turn 22 (pass 92,940) the
  pile was fourteen objects and the mushroom the eleventh; each of four
  searches stopped at `$E8F1`, the byte before was 3, and the marks went
  on entry 3, the fourth wizard's, empty (type `$FF`) in a game of two;
  the mushroom stayed where it was. In game turn 23 (pass 93,557) the
  pile was fifteen and the mushroom the twelfth. The first search
  stopped at `$E8F1` again. Before the second, computer_try_spell raised
  the FLYING POTION's priority in spell_priorities (`$D3F9`) from 128 to
  130 (`$82`), so the search stopped there, and the byte before,
  `$D3F8`, was the SPEED POTION's priority, 255. Entry 255's bytes 3 and
  4 are `$6157` and `$6158`, the operand of `LD HL,$5B11` in
  game_turn_loop (`$6156`), which became `$0191`. The turn loop then
  increments a byte of the ROM. The computer's turn ends,
  end_of_turn_menu (`$C8E4`) comes up, and the next game turn sets the
  player number to 0 and it stays 0, never reaching the count of players
  (`$D067`): the loop goes round for ever, about 2.7 times a second,
  with the screen blank. In ZEsarUX, after CONTINUE, it went round 32
  times in 600 frames with no pixel set and KEY-SCAN never called, and
  SPACE, ENTER, 0, 5 to 8, Q, A, O, P and M changed nothing; the kit's
  machine, run on from the machine saved at pass 93,558 with SPACE
  pressed in the menu, gave the same 32.

## The listing's error rate

Sample `sample-7061` (seed 7061): 80 comments drawn from the 1,129 in
the five parts' listings, in two strata: 20 from the 76 generated
descriptions of creature types (the stratum `generated`, matched by
"action points on the ground, \d+ flying") and 60 from the 1,053
written ones. The checker was `claude-opus-5-5`, an agent that wrote
none of the comments. It found 12 wrong, all 12 confirmed against the
code: 0 of 20 generated and 12 of 60 written, 15.0 % plain (95 %
interval 8.8 % to 24.4 %, Wilson) and 18.7 % weighted by the strata's
sizes, which is over the mark. One more it could not settle (which
Interface 2 socket is the keys 6 to 0); the comment no longer says. The
twelve: a byte called a count of passes that holds the comparisons in
a pass (`$9A45`); find_partner said to find a mount or rider, when it
skips riders (`$7156`); the weapons' second and third bytes read as
healing and mana, when they are the combat and defence a weapon adds
(`$D667`, and every scenario's weapon records with it); draw_map said
to call thing_graphic, which it copies inline (`$A94C`); layout 3 said
to be the designer's, when it is the start-up SELECT CONTROLS menu
(`$929D`); an argument said to be in DE that arrives in HL (`$A936`);
and six lists of cases or users left short (the USE hook `$D024`, a
rider shown on a death `$7755`, the bits clear_map_things clears
`$796A`, the waiting computer creature `$974E`, the users of `$D0CC`
and of the computer's bytes `$D17A`). All twelve were corrected, with
the comments that said the same: the object records of all three
scenarios and their header pointer, and the magic bow (`$63`), which an
engine comment and this file had called the magic shield.

## Live tests

Run in ZEsarUX 13.0 from snapshots of the game in play (`work/`, not
committed), driven through its remote port by the run's scripts.

- The map window: LOCMap.window, drawing from the snapshots of play in
  scenarios 1, 2 and 3 with their creatures and objects, matches the
  emulator's screen with 0 pixels different (test_map.js holds the same
  drawing to draw_map on the kit's Z80, 864 windows).
- Execution maps: ending turn after turn from each scenario's play
  snapshot (30 turns in scenarios 2 and 3), and a session in the
  designer, with the emulator recording every address the processor
  ran. Scenario 1: 6,757 addresses, 6,566 of them in the engine and 191
  in the scenario. Scenario 2: 5,884, 5,853 and 31. Scenario 3: 5,466,
  5,383 and 83. The designer: 1,626, 675 in the engine, 859 in the
  designer and 92 in the ROM. The maps decided code from data where the
  static reading could not.
- find_file: a tape of two wizard files, MORDRED2.WIZ then MERLIN1.WIZ.
  LOAD WIZARD with the name MERLIN1 printed LOADING: MORDRED2.WIZ and
  put MORDRED, level 2, in the first slot
  (`reference/load-*.png`).
- design_exit: a wizard designed with 597 experience points left, saved
  with EXIT and designed again, started with 596
  (`reference/designer-*.png`).
- debug_probe: called from the main loop of scenario 1's play snapshot
  with a CALL pushed by hand, it printed 1 at row 21, column 0, in the
  ROM's font, yellow on red, and waited until fire was pressed, then
  returned (`reference/debug-probe.png`).
- The strength vials: in a game of scenario 2 started in the emulator,
  the two strength vials (`$73`) on the map held 255 in byte 5 and the
  other vials 4 to 7.
