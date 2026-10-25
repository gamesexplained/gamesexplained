# The title — verified technical facts

INIT (module 3) and the files it loads before the game proper: the title
picture, its sprites, the music player MDRIVER and the tune MUSIC, the
font CHARSET. Every address here is the title part's. Unless marked
*live*, a fact comes from the code in `title_play`. Live tests are listed
in the game's own `facts.md`.

## What INIT does

- `init_start` (`$0800`) loads MDRIVER, the fast loader's drive half when
  the player kept it, then CHARSET, which it copies to `$D000`; then the
  title (`title_screen`, `$0BCD`), the credits (`credits_script`,
  `$1173`), the menu, and the code word (`code_wheel`, `$11DF`).
- Files load from the table `init_load_lo` (`$0A83`), not from the
  addresses in their own first two bytes.
- `default_icon` (`$0B2D`) is the combat icon every party slot is given:
  two poses of 3 by 3 characters, all blue but the head.
- The menu offers PLAY GAME and DEMO (`play_menu`, `$1363`).
  `wait_menu_choice` (`$09DE`) waits for a key with a count of 250 times
  256 rounds of a delay loop; when the count runs out the choice is DEMO
  (`play_or_demo`, `$0989`), which loads the script ECL1E into DUNGEON
  (`choose_demo`, `$09BD`).
- `clear_title_ram` (`$0BB4`) is called by nothing. As written it would
  fill from `$FFFF` upwards, through the zero page and the program itself.

## The title picture

- TITLEPG is packed by runs (`title_packed`, `$6F00`): a byte `$00`-`$7F`
  copies that many bytes, `$80`-`$FE` repeats the next, `$FF` ends. It
  unpacks to 9,216 bytes from `$DC00` to `$FFFF`, the colours then the
  hires bitmap at `$E000`.
- Seven sprites from SPR.TP (`title_sprites`, `$C000`): three fill the
  TSR logo in red, the rest are sparkles, each moving on one of sixteen
  frames with a chance of 15 in 256 a pass (`sparkle_loop`, `$0CA1`).

## The code word

- `code_wheel` picks one of twelve words (`code_word`, `$1376`) and one
  of three paths (`code_path`, `$1377`) at random; the word to type does
  not depend on the path. It shows the Espruar and Dethek runes for that
  word and path (`espruar_runes`, `$12F7`; `dethek_runes`, `$133F`).
- The answer is compared with the word's seven bytes in the table at
  `$1039`. A first wrong word brings a new question; the second stops the
  game at `$12F4`, a jump to itself (`wrong_word`, `$12DF`). *Live*.

## The music

- MDRIVER (`sound_play`, `$BA00`) is SOUNDFX's driver with the
  instruments' addresses changed; MUSIC (`music_table`, `$C400`) is its
  data: twenty entries, of which 0 to 11 are SOUNDFX's sounds, 12 the
  title tune and 13 to 19 the same tune started at its later sections.
  INIT only ever starts 12 and 0.
- The tune (`title_tune`, `$C609`) is 1,100 notes and 92 rests on the
  third stream, 5,976 interrupts long, in eight sections. At 60
  interrupts a second it lasts about a minute and 40 seconds.
- A note's length is one of eight counts in interrupts (`note_lengths`,
  `$BD7B`): 6, 12, 18, 24, 36, 48, 72 and 96. A quarter note of 24 is 0.4
  seconds, 150 beats a minute.
- Eight instruments of nine bytes (`instruments`, `$BD8B`): 1, 2, 5 and 6
  pulse waves, 3 and 4 sawtooth, 7 triangle, 8 a pulse an octave up.
- The title ends by itself after the tune has been silent for 256 passes
  of the title's loop (`tune_silent`, `$11C1`).
