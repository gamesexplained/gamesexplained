# Party creation — verified technical facts

GEN, module 0: the Party Creation Menu, from creating a character to
BEGIN ADVENTURING. Every address here is the gen part's. Unless marked
*live*, a fact comes from the code in `party_menu`. Live tests are listed
in the game's own `facts.md`.

## The menu

- Ten choices (`main_menu_text`, `$112C`; routines from `main_menu_lo`,
  `$08A9`): CREATE NEW CHARACTER, DROP, MODIFY, TRAIN, VIEW, ADD
  CHARACTER TO PARTY, REMOVE, LOAD SAVED GAME, SAVE CURRENT GAME and
  BEGIN ADVENTURING. `main_menu_mask` (`$129E`) offers CREATE, ADD and LOAD
  with no party, and TRAIN only in a training hall (`$6DA8` not zero).
- BEGIN ADVENTURING (`begin_adventuring`, `$08BD`) sets DUNGEON as the
  next module and returns to the linker.

## Creating a character

- `create_character` (`$0900`) asks in turn for the race, the gender,
  the class and the alignment, rolls the scores, then the name, the
  portrait and the combat icon. *Live*: the race menu offers DWARF, ELF,
  GNOME, HALF-ELF, HALFLING and HUMAN; the tables carry a seventh race,
  the half-orc, which the menu leaves out.
- Each score is the best of six rolls of 3d6 (`roll_ability`, `$0D1F`),
  then adjusted for race and gender (`ability_adjust`, `$0D60`) and held
  between the race's minimum and maximum (`ability_minimum`, `$0DB4`;
  `ability_maximum`, `$0E08`). *Live*: a male human's strength and
  constitution each went up one.
- An 18 strength rolls a percentage only for a class with a fighter's
  part (`class_pct_cap`, `$0FD2`), up to the race's and gender's cap
  (`strength_pct_cap_race`, `$0FBF`).
- 17 classes, each a mask of class parts (`class_masks`, `$101D`); each
  class allows its own alignments (`class_alignments`, `$0EE3`). *Live*: a
  human thief was offered every alignment but lawful good and chaotic
  good.
- The portrait is one of 14 heads and 12 bodies (`choose_portrait`,
  `$12B6`); the combat icon is made in the icons part.
- MODIFY CHARACTER works on first-level characters only (`modify_choice`,
  `$1ADE`).

## Training

- `can_train` (`$1BBC`) finds, for each class the hall trains that the
  character has, the highest level its experience reaches, held to the
  class's limit (`class_max_level`, `$1E5C`: magic-user 6, cleric 6,
  thief 9, fighter 8) and the race's (`race_level_limit`, `$24A0`); a
  class goes up one level only, whatever the experience.
- The experience needed is three bytes a level (`xp_table`, `$1DB5`): a
  magic-user needs 2,501 for level 2, a fighter 2,001.
- Training costs 1000 gold (`pay_training`, `$1D63`). All the coins are
  then counted in thousands of copper and paid back as platinum, so change
  under five gold pieces is lost.
- New hit points: a die for each class part going up (`hp_sides`,
  `$20A7`: 4, 8, 6, 10 for magic-user, cleric, thief, fighter), divided
  among the class's parts (`train_hp`, `$2037`).
- The saving throws are the best of the class parts' (`saving_throws`,
  `$1F44`), and the to-hit figure the best of `to_hit_table` (`$1F1F`).
  *Live*: a new human thief showed THACO 21.

## Saving and the save disk

- SAVE CURRENT GAME writes SAVEDGAME1 (the party table from `$8300`) and
  then SAVEDGAME0 (`save_game`, `$24CD`).
- ADD CHARACTER reads the save disk's directory and lists the files whose
  name starts with byte `$01`, the mark of a character (`dir_byte`,
  `$1825`).
