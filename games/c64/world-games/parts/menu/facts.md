# The menu: facts

File `B`, on both sides of the disk, unpacked at `$1000`. It is the
main menu, the registration, the results and medals after each event,
the ceremonies and the world records. Every fact names the routine or
table it comes from, in this part's listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$1F37` | the menu's code, its texts and the anthem player (`anthem_step`, `$1EA2`) |
| `$1C04`-`$1E33` | anthems in rows of four bytes, the notes' frequencies (`note_freq_lo`, `$1DC4`) and the rows' lengths (`note_lengths`, `$1E1C`) |
| `$2000`-`$26B7` | the character set (`menu_charset`), with the pieces of the flags |
| `$26B8`-`$30C5` | the eighteen flags as three strips of characters and colours |
| `$3100`-`$32BF` | the sprites (`menu_sprites`): the arrow and the four corners of the frame round the chosen flag |
| `$32C0`-`$3A38` | the list of tunes (`tune_list`) and the other anthems; tune 19 for the world records (`tune_records`, `$3426`), tune 18 for the final standings (`tune_standings`, `$3852`) |
| `$3A39`-`$4158` | the registration: its interrupts, the keyboard, names and countries |
| `$4159`-`$43FF` | zeros nothing reads (`menu_unused3`) |

## The options

- Seven options (`$1037`): compete in all the events, in some, in one;
  practise one; the number of joysticks; see the world records; the
  travelogue on or off. A key from 1 to 7 or the stick and fire chooses
  (`pick`, `$1AFC`; *live*, 30 October 2026, key 4 chose practice and
  key A weightlifting).
- Practice (`opt_practice`, `$10FF`) names every player CONTESTANT
  (`contestant_name`, `$1641`), sets `practice` (`$081D`) and one player.
- Before a competition the players are listed with "IS THIS CORRECT?"
  (`check_players`, `$1651`), or sent to the registration when there are
  none or after a practice.
- Each event's players are put in a random order first
  (`shuffle_players`, `$1A91`). "NEXT EVENT:" and its name wait 400
  frames or the fire button (`next_event_screen`, `$1369`).

## The registration

- Up to eight players. A name is typed at row 0 a key at a time, up to
  ten characters, read straight from the keyboard matrix (`read_key`,
  `$3B4A`; `reg_name`, `$3C19`). A name an earlier player has is
  refused (`same_name`, `$3C8F`), and a name of only spaces ends the
  registration once there is a player.
- The row's template reads "NELSON S.  PICK YOUR COUNTRY", the name
  written over NELSON S. (`pick_country_text`, `$3CE9`).
- The country is chosen by moving a frame over eighteen flags in three
  rows of six (`move_frame`, `$3DFF`): USA, France, Great Britain, West
  Germany, Austria, Italy; USSR, Canada, Mexico, Spain, Denmark,
  Australia; Japan, Netherlands, Epyx, Norway, Ireland, Brazil. Epyx is
  one of the countries, with a flag and an anthem of its own. The
  country goes into the record as a number and three letters in
  brackets (`store_country`, `$3F5E`).
- The S key plays the anthem of the country under the frame without
  choosing it; a move of the stick stops the anthem; fire chooses and
  plays it, and the next player comes after it (*live*, 30 October
  2026).

## Results and medals

- After an event (`event_results`, `$17D4`) the players are sorted by
  the three bytes of their score (`sort_players`, `$1A4E`). Players with
  the same score share a place, and the place after them moves on by all
  of them (`$1803`). The first three with a score above 0 get gold,
  silver and bronze (`award_medal`, `$15BE`).
- A score text ending in M gets the small m, character `$B8`, and a
  score of 0 is shown as " FAULT" (`tidy_scores`, `$18B6`).
- The best score is compared with the event's world record; as good or
  better is a new record (`check_record`, `$18F6`), saved to the disk by
  the shell, in practice too.
- The winner's flag is drawn in the middle of the screen and the
  country's anthem played (`ceremony`, `$184B`).
- The final standings count five points a gold, three a silver and one
  a bronze (`count_points`, `$157C`), and reveal the players from the
  last place to the first, under tune 18 (`$11A7`).

## The random generator

`random` (`$1AD9`) shifts `$08FD`-`$08FE` with feedback from its own low
bits and mixes in a counter, `$08FF`, by EOR. The three bytes are the
tail of the eighth player's record, which no copy of a record touches
(`swap_records`, `$1AAF`, copies only up to byte `$1C`). `next_frame`
(`$1BD9`) stirs it once a frame.

## Sound

The menu has its own player, not the events' music driver: rows of four
bytes, a note for each voice from a table of semitones (`note_freq_lo`,
`$1DC4`, note 1 `$0470`) and the row's length (`note_lengths`,
`$1E1C`), stepped twice a frame (`anthem_step`, `$1EA2`), so a hundredth
of a second a step on a PAL machine. Twenty tunes: an anthem for each of
the eighteen countries, 18 under the final standings and 19 under the
world records (`tune_list`, `$32C0`). The United States' opens G E C E G
C (the Star-Spangled Banner, `anthem_usa`, `$1D16`) and Great Britain's
G G A F# G A (God Save the Queen, `anthem_gbr`, `$1D7F`).

## Registers

The VIC-II's screen, character set, sprites, raster interrupts (eight
lines in the registration, `reg_irq_lines`, `$3ACC`) and colours; the
SID's voices and volume; CIA 1's ports for the keyboard and both
joysticks, and its interrupts stopped.

## Strings

In screen codes: the options, "PRACTICE WHICH EVENT?", the events'
names (`event_names`, `$1710`), "WORLD RECORD", GOLD, SILVER and
BRONZE, "FINAL STANDINGS:", "NEXT EVENT:", "IS THIS CORRECT?",
"COMPETITOR G S B TOTAL", " #1 ENTER YOUR NAME", and the countries'
names under the flags.
