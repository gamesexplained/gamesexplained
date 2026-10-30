# The menu, the players and the medals — verified technical facts

File `M`, `$0F00`-`$3FE5`, loaded after the opening ceremony and after
every event. Every address here is this part's. Unless marked *live*, a
fact comes from the code in `work/entry.vsf`.

## The main menu

- `main_menu` (`$0F1F`): seven options, chosen with the pointer on
  either joystick or by their digit (`choose_option`, `$1A6B`), run
  through an RTS table (`main_menu_lo`, `$0FCD`) (*live*).
- `menu_entry` (`$0F00`) resumes where the menu left off to load an
  event (`$085D`-`$085E`, kept by `run_file`, `$1292`), so a competition
  goes on from event to event with the menu loaded again between them.
- `opt_more_events` (`$0FF3`) turns `$087F` over, which would list sixteen
  events, the last nine from Summer Games and Summer Games II
  (`event_names`, `$1639`); nothing calls it.

## Players

- `name_entry` (`$39DA`), a program of its own within the menu: up to
  eight players, a name of up to ten characters each, refused when it
  matches an earlier player's (`same_name`, `$3C4F`); an empty name ends
  the list.
- The flag chooser: a strip of 18 flags in three bands of six, 78
  columns wide, scrolled 13 columns a flag (`entry_joystick`, `$3D19`;
  `draw_strip`, `$3DCF`); eight raster interrupts a frame colour the bands
  (`entry_irq`, `$3A6B`). `S` plays the anthem of the flag in the frame;
  fire chooses it (`entry_fire`, `$3EBA`).
- The 18 countries (`country_codes`, `$3CD1`): USA, FRA, GBR, FRG, AUT,
  ITA, URS, CAN, MEX, ESP, DEN, AUS, JPN, HOL, EPX, NOR, IRL and BRA,
  EPX being Epyx's own flag.

## Competition

- `compete` (`$1077`) runs the chosen events in turn, the opening
  ceremony first, with a new order of play for each (`shuffle_players`,
  `$1A00`) and the medal table between them.
- `show_results` (`$174B`): the players sorted by score
  (`sort_players`, `$19BD`, highest first), players with the same score
  sharing a place, a score of 0 shown as FAULT, medals to the first three
  places when their score is not 0 (`give_medal`, `$14C3`), the winner's
  flag and anthem (`show_winner`, `$17BD`).
- `work_out_totals` (`$1481`): 5 points for gold, 3 for silver, 1 for
  bronze.
- `check_record` (`$1865`): a winner who beats the event's world record
  replaces it, and the records are saved to the disk through the
  loader's `$0934`.
- `opt_practice` (`$0FFE`): one player called CONTESTANT, no results.

## Music

`music_step` (`$1E11`), twice a frame: three voices, four bytes a note
(three pitches and a length). `tunes` (`$3280`) holds 20 tunes by even
number: the 18 anthems, 36 for the final standings and 38 for the world
records.
