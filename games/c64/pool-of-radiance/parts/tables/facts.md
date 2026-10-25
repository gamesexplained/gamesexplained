# The game's tables — verified technical facts

The files INIT loads after the code word and that stay in memory for
the rest of the game: SOUNDFX, ITEMS, ITEMNAMES, DUNGEON2 and COMBAT3.
Every address here is the tables part's. Unless marked *live*, a fact
comes from the code and data in `phlan_party`. Live tests are listed in
the game's own `facts.md`.

## Items

- ITEMS (`item_types`, `$7B00`) is 128 item types of 16 bytes. Byte 0 is
  the class the code tests (0 weapon, 1 shield, 2 armour, 9 rings, of
  which two can be readied), 1 the hands it takes, 2-4 its damage against
  large creatures as dice, sides and bonus, 9-11 against small and
  man-sized ones, 13 the classes that may ready it.
- ITEMNAMES (`item_word_lo`, `$6F00`) is the addresses of 256 words and
  the words themselves from `$7100`. Words 1 to 47 are the weapons,
  numbered like the weapon types they name; 48 to 61 the armours; the
  rest the nouns, pluses and "OF ..." of magic items. Words 0, 62, 63 and
  168 have no text.

## DUNGEON2 and COMBAT3

- DUNGEON2 (`$7A00`) is a little of the adventure module's code kept
  outside it: the unpacker for the wall sets' colours (`unpack_pushed`,
  `$7A00`), SEARCH (`search_command`, `$7A91`), and the count of days gone
  by (`count_step`, `$7A5F`).
- COMBAT3 (`$7AC0`) holds the joystick's eight directions
  (`joystick_dir`) and the turning tables: for each undead type, the
  number a cleric's d20 must reach at the type's turning level
  (`turn_level`, `$7AE4`), less 3 for each level above it (`turn_number`,
  `$7AF1`).

## The sound effects

- SOUNDFX (`sound_play`, `$BA00`) is played a step at each interrupt, 60
  times a second; `$BA03` starts sound A. Three streams of commands, one
  for each SID voice (`sound_voice`, `$BA33`): a byte `$00`-`$0F` sets a
  field, `$40` and up repeats, `$80` and up is a note with its length and
  instrument (`sound_commands`, `$BAB4`).
- `sound_table` (`$BD7B`) names twelve sounds: 0 silence, 1 three
  sawtooth voices warbling, 2 a rising noise burst, 3 a rising pulse
  tone, 4 a sawtooth trill over a slow noise, 5 a high pulse warble, 6 a
  falling noise, 7 a sawtooth warble, 8 a high hiss, 9 a low rumble (a
  step that is blocked), 10 a short burst then a long rumble, 11 a
  three-note pulse chord.
- The note table (`note_frequencies`, `$BC8D`) is seven octaves of
  semitones from 536, a C on an NTSC machine's clock.
