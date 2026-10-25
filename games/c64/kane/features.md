# Kane — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay, "The Aim of the Game" (Mastertronic, 1985), scanned in the Internet Archive item `uta_Kane_1985_Mastertronic_7916` (https://archive.org/details/uta_Kane_1985_Mastertronic_7916), read 25 October 2026. The game's own manual.
- C64-Wiki, https://www.c64-wiki.com/wiki/Kane, read 25 October 2026.
- Wikipedia, https://en.wikipedia.org/wiki/Kane_(video_game), read 25 October 2026 (covers every version; its shootout figures may be another machine's).
- Mastertronic fan site review, https://mastertronic.co.uk/game-review-kane-commodore-64-mastertronic/, read 25 October 2026.
- The game's own screens, in the emulator.

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen: "Press Fire To Start", "F1 For Practice", "F7 For Score Table", "Previous Score", and a credits line that changes (design and programming John Darnell; graphics J. Darnell, N. Baikaloff, J. Porch; a Mastertronic presentation) | live | `title_screen` `$3250`, `credit_line` `$3E6B` |
| Practice: F1 asks "LEVEL 1 2 OR 3 ?", then offers F1 bow and arrow, F3 horse ride 1, F5 shoot out, F7 horse ride 2 | live | `practice_menu` `$336C` |
| Score table on F7 ("Hall of Fame and Worth", initials and score) | live | `show_hall_of_fame` `$3C9D`, `fame_entries` `$8C74` |
| Joystick in port 2 only (inlay) | confirmed: every stage reads CIA 1 port A, `$DC00` | `$35FD`, `irq_ride_control` `$2A25` |
| Stage 1, the canyon: shoot migrating ducks with a bow and arrow; the stick moves an aiming cross, fire shoots (wiki) | live | `duck_loop` `$1950` |
| Ten arrows at the start (wiki); the status line shows ten arrow marks between "Birdies Killed" and "Birdies Home" | live | `start_ducks` `$11D1`, `draw_arrows` `$1E31` |
| A hit duck gives the arrow back; one arrow through two ducks gives two (wiki, review) | confirmed for the arrow given back, up to ten; traced for two ducks: each duck that touches the arrow is hit and gives an arrow back, and the arrow stays where it is while a hit duck falls; two ducks on one arrow not tried live | `move_duck` `$1BC3`, `move_arrow` `$1B5C` |
| A peace token (a life) for every few ducks: three on level 1, four on level 2, five on level 3 (wiki) | confirmed | `start_ducks` `$11D1`, `move_duck` `$1BC3` |
| The arrow flies faster the steeper it is shot (wiki hint) | confirmed: the step is the distance to the sight over 8 when the sight is less than 112 pixels to the archer's left, over 16 when it is further | `duck_loop` `$1950` |
| The stage ends when the arrows run out (review) | confirmed, and also when 39 ducks have got home | `$1AEF` |
| Stage 2, ride to Kane: ride against a time limit ("Time Remaining 1.58 Minutes", "Distance To Go 4.00 Miles" shown), fire jumps bushes and stones; a mistimed jump costs a token (inlay, wiki, review) | live for the ride and its status lines; confirmed for the token lost at a fall | `ride1_step` `$2333`, `$23C2` |
| Stage 3, the shootout in Kane: gunmen hide at windows, doors, roofs and wagons; shoot them all (wiki: twelve; the status line shows "Bad Guys Killed" and "Bad Guys Left"); the stick moves the Marshall and his sight | live: twelve from sixteen hiding places, four at a time at most | `$35FA`, `gunmen_appear` `$3E77`, `places` `$9169` |
| Reload by running off the screen to the right (inlay) | confirmed: past x 383 the bullets go back to six | `walk_right` `$38B4` |
| Standing still makes the gunmen's shots more accurate (inlay) | differs: the aim closes in while he stands, and while he walks a gunman's shot does nothing at all (live) | `gunmen_aim` `$8A61`, `gunman_fires` `$8AF2` |
| Stage 4, the train: ride after the train and overtake its coaches to stop it; two coaches on level 1, seven on level 2, eleven on level 3 (wiki); a collision costs a token; no time limit (review) | differs on level 1: three coaches, then seven and eleven; confirmed for the rest: the track loops and there is no clock | `start_ride` `$1F3B`, `train_step` `$228B` |
| After the train, the game goes back to the ducks one level higher (wiki) | confirmed | `ride_loop` `$209E` |
| Losing every token ends the game (review) | confirmed: game over and the title, with the hall of fame check | `$22FC`, `marshall_dies` `$8BC5` |
| An ending text after the last level ("So war with the Wagari Indians was finally ended ...") | live | `ending_text` `$8CAC` |
| Music: the William Tell Overture at the start and in both riding stages; a drum beat in the canyon (review) | differs: the tune plays on the title, ride 1 and the ending; the train has hoofbeats instead. The drum is confirmed, its writes held against the game's code by `test_music.js` | `start_ride` `$1F3B`, `drum_sound` `$92C9` |
| Sampled sounds: a screech when a duck is hit, and a cry when the Marshall dies (review; Zzap!64 praised them, per Wikipedia) | confirmed: five sounds, one recording of a cry used for a duck, a gunman and the Marshall, the whinny, and a man's voice saying "Well done" at the ending (heard by the contributor) | `play_hit` `$9337`, `$935B`, `$9349` |
| RESTORE or a reset restarts the game (the `CBM80` signature at `$8004`) | differs: a reset restarts it (live), RESTORE does nothing (the NMI vector points at an RTI) | `start_stage` `$3163`, `nmi_ignore` `$3162` |

## Beyond the documentation

Found in the code, not in the manual. The Discoveries tab shows each one.

- Ride 1's bonus is biggest with under a minute left: 256 counts against 80 to 169 (`ride1_step`, `$2333`; live).
- `count_score` steps by `$0B` in decimal mode and puts more on the score than it was given (`$3B9A`; live, 594 gave 706).
- A walking Marshall cannot be shot (`gunman_fires`, `$8AF2`; live).
- F1 restarts a ride at any moment with the clock full and no token lost (`ride_loop`, `$209E`; live).
- Two gunmen can share a hiding place (`$3ED4`; live).
- A reset after the train gets away starts BASIC (`clear_obstacles`, `$313F`; live).
- The Marshall's first shot after loading is silent, and each later shot starts nine frames late (`shot_sound`, `$920E`; live).
- The coach count stops at 19 on the screen (`train_step`, `$228B`; live).
- The ending's tune slows at two of its nine places (`$31DC`, `tune_slowdowns` `$8E5D`; on the game's code, `test_music.js`).
- The shoot-out's bonus is one lot of 99 a level, with a `Y` of 5 that nothing counts (`$37E3`; on the game's code, `test_score.js`).
- An older build of part of the code at `$8010`-`$8727` and `$3F3A`-`$3FFF`, and routines nothing calls at `$1D96`, `$300E`, `$CF73` and `$FF90`.

## Open questions

- What the older build at `$8010` does differently from the code that runs: it was matched to `$37F3`-`$3EE6` by its shape, not compared instruction by instruction.
- Whether one arrow can hit two ducks in play: the code allows it, and it was not tried live.
