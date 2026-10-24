# Paradroid — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Paradroid", https://www.c64-wiki.com/wiki/Paradroid, read 24 October 2026
- Hewson's inlay for the Uridium and Paradroid Double Value Pack (1987, cassette), scanned on the Internet Archive as https://archive.org/details/Uridium_Paradroid_Double_Value_Pack_1987_Hewson_compilation, read 24 October 2026. It is the tape compilation's inlay; the disk analysed here is the 1985 disk
- The game's own briefing pages and screens, seen in the emulator
- Andrew Braybrook's diary of the game's making in Zzap!64 ("Birth of a Paradroid") could not be read: zzap64.co.uk answered with a browser check and the Wayback Machine's connection closed, 24 October 2026

## Features

| Feature | Status | Where |
|---|---|---|
| Title sequence: logo, credit "by Andrew Braybrook", a tune; fire starts | live | the picture at `$CC00` (`title_screen`, `$2879`); the sound is made up as it plays (`title_sound`, `$054A`), there is no stored tune; fire starts a game (`restart`, `$10D3`). Seen in the emulator (`reference/title.png`) |
| Briefing pages between the title and play ("Press fire to play", the controls) | live | five pages printed into the deck map and scrolled (`attract_page`, `$1184`; `title_pages`, `$D000`); "Briefing" on the status line |
| The player is the 001 Influence Device, beamed aboard a freighter of rogue droids | live | `game_start` (`$1242`), the host type `$0340` = 0; the beam-in (`ship_start`, `$1289`) |
| 24 droid types in 9 classes plus the 001, each numbered; the higher the number, the stronger | confirmed | `type_class` (`$EA00`) and `type_number` (`$EA20`): the 001 and 23 robots of classes 1-9 |
| Each droid type has a description in the Droid Data Library (from a console) | live | `droid_records` (`$EB00`) and the dictionary (`$C000`), printed by `describe` (`$2D92`); the 001's entry seen (`reference/enquiry-001.png`) |
| A ship of decks; the deck shown from above, scrolling in every direction | live | 16 decks (`build_deck`, `$3590`), 8-way scroll (`scroll`, `$3849`, `irq_top`) |
| Joystick in port 2: the stick moves, with momentum | confirmed | `read_stick` (`$091A`) reads `$DC00`; `move_player` (`$39F9`) changes the speed by a fraction of a pixel a pass, up to the host's top speed |
| Fire with a direction shoots; the 001 fires low-power twin lasers | live | `shoot` (`$33B5`), "Weapon" on the status line; the 001's twin laser shapes `$30`, `$31`, `$54`, `$55` |
| Laser mode: fire held with the stick centred turns the droid white and holds the shot until the stick is jabbed | confirmed | `fire_state` (`$31B9`): fire held with the stick centred is state 2, and a push then fires; held centred for 8 passes it becomes transfer mode instead. The host's colour changes in transfer mode (`energy_symbols`) |
| Firing backwards while running: momentum keeps the droid moving | traced | `move_player` runs every pass whether or not fire is held, so the stick steers while firing; the speed changes by a fraction of a pixel a pass, so the host carries on for a moment. Not tried in play |
| Lower classes have no weapon; higher classes single or twin high-power lasers; two Battle types (711, 742) carry disruptors that damage every droid nearby | confirmed | `type_weapon` (`$EA80`): none for 16 types, guns 1 and 2, the disruptor (3) for the 711 and 742 (`disruptor`, `$231E`) |
| Ramming another droid damages it (and the rammer, by class) | confirmed | `ram` (`$1A6A`): host type + 2 − robot type decides who is hurt |
| Transfer mode: fire held with the stick centred, then ramming a droid starts a transfer | live | `fire_state` and `ram`: a touch in transfer mode puts the robot's slot in `$6B` and the main loop starts `transfer` (`$229D`) |
| The transfer game: a circuit of wires and 12 rectangles on a central bar; each side has pulsers; set at least 7 to your colour; sides chosen left or right in a few seconds; terminators, joiners, colour switchers, splitters, auto-pulsers | confirmed | `transfer_setup` (`$E016`), `place_piece` (`$E222`), `flow_column` (`$1EB6`), `count_middle` (`$2057`): 7 or more of 12 leads; the side is chosen while "Colour?" counts down from 99 steps of the delay. Seen in play (`reference/transfer-choose-colour.png`) |
| Transfer won: the old host is destroyed, the player controls the new droid. Lost: back to the 001, or the game ends if the 001 had no host | live | `transfer_result` (`$21CF`); lost from a 139 host the player went back to the 001, lost as the 001 the game ended (facts.md, Live tests). The target is taken off the ship either way (`transfer_done`, `$2260`) |
| A host droid's energy burns out over time, faster for higher classes; the 001 does not lose maximum energy | differs | `alert` (`$3E32`) and `burn_masks` (`$6DDE`): the maximum falls a point every 128 passes for the 001, 64, 32 or 16 for the others by class. The 001 loses it too, and the game ends when it reaches 0. Live: 60 → 58 in 800 frames; with the maximum at 1, game over at the next fall |
| Energy shown by the speed the player's symbol rotates; it flashes when low | confirmed | `energy_symbols` (`$3CFB`): the symbol's timer restarts at (64 − energy) / 8; below 8 energy the player's sprite flashes, with effect 8 |
| Energisers (flashing lights on the deck) restore energy, costing 5 points a second | differs | `floor_cell` (`$2E7B`): a point of energy every fourth pass, 5 points of score for each, so about 21 points a second. Live: 17 energy for 85 points in 200 frames |
| Droids are sometimes disturbed into attacking one another | traced | robots aim only at the player (`aim_shot`, `$34B5`), but a robot's shot or an explosion damages any robot it meets (`pair_rules`, `$1B51`), so robots do destroy one another |
| Consoles: hold fire on one for a menu: return, query robot (Droid Data Library, only droids of lower rank than the host), deck plan, side view | live | `floor_cell` (5 passes on character `$42`), `console` (`$2C04`); the enquiry offers the types up to the host's own, equal included (`enquiry_pick`, `$2CF0`). Seen (`reference/console-menu.png`) |
| Small-scale deck plan: the whole deck with lifts, consoles and energisers | live | `deck_plan` (`$3001`), `draw_plan` (`$30A0`) (`reference/deck-plan.png`) |
| Side view of the ship | live | `draw_side` (`$3069`) (`reference/side-view.png`) |
| Lifts (coloured circles): hold fire, pick a deck in the side view with up and down, fire to leave | confirmed | `floor_cell` (5 passes on `$2B`-`$2E`), `lift` (`$267A`), `lift_move` (`$2705`) |
| Power down: when the last droid on a deck is gone the lights go out and bonus points are scored | confirmed | `update_droids` (`$174B`): with only the player left, scheme 7, 500 points, effect `$17` |
| Decks cleared show grey on the side view; some decks are in several sections | open | the side view marks only the player's deck (`mark_deck`, `$240C`, from `draw_side` and the lift); searched every instruction that reads the population table `$0400` (`build_ship`, `load_deck`, `unpopulate`) and the ten that read the deck number `$33` for a mark of a cleared deck, and found none. Not looked for in play |
| Alert status green, yellow, amber, red: rises when droids are destroyed quickly; 5, 10 or 25 points a second | live | `alert` (`$3E32`), `alert_points` (`$6DE8`): 0, 5, 10 or 25 every 16 passes, about a second. Live: 225 points in 133 passes at red |
| Scoring: ramming 10 × class (100 for class 9); shooting or transferring 25 × class (250 for class 9); deck clear 500, ship clear 2000; transfer failure −10 × class (−100 for class 9); energiser −5 a second | differs | `kill_points` (`$6DEC`) and `ram_points` (`$6DF6`): ramming a class 9 robot scores 200, not 100, and an energiser takes 5 points for each point of energy it gives, one every fourth pass, about 20 points a second (`floor_cell`, `$2E7B`; live: +17 energy and −85 points in 200 frames); the rest as documented, the transfer failure being the host's ram points |
| Explosions cost energy when driven through | confirmed | `blast_hits_player` (`$1B1A`): the ship number a pass |
| The 999 Command Cyborg burns out quickly | live | class 9's mask `$0F`, a point every 16 passes: 60 → 51 in 133 passes |
| Run/Stop pauses; fire or Run/Stop resumes; Clr/Home abandons the game; F7 stops the animation and F8 restarts it during the pause; not during a transfer | live | `pause` (`$3B7C`), `cheese` (`$0B8A`) (`reference/pause.png`, `reference/pause-cheese.png`) |
| On the title: F1 colour, F2 black and white, F5 and F6 music volume | live | `colour_key` (`$32B7`), `volume_keys` (`$0CB4`) (`reference/title-volume.png`) |
| C64-Wiki cheat: POKE 8410,0 (`$20DA`) before RUN makes every transfer win easily (written for a one-file copy) | differs | in this build `$20DA` is the first byte of `countdown`; poked to 0 (a BRK) the countdown stays at 99 and the transfer never ends (live, 4,000 frames) |
| The game's own pages: "Hewson Consultants Ltd. presents Paradroid, © Graftgold Ltd. 1985", "Plug your joystick into port 2", "Press fire to play"; the controls page; the story of the Robo-Freighters near Beta Ceti; the 001 Influence Device; the robot symbols and the console | live | `title_pages` (`$D000`), `page_story`, `page_device`, `page_console`, `page_scores` |
| Credits on the pages: "Paradroid programmed by Andrew Braybrook. Sound advice by Steve Turner." | live | `page_credits` (`$DE8A`) |
| "Top score of the day" (6809 - AEB before any game) and "Worst score of the day" (6502 - TSO); a game that sets either asks for initials ("Lowest Score of the Day!") | live | `top_score` (`$E70C`), `worst_score` (`$E710`), `score_check` (`$E4E5`) (`reference/lowest-score.png`) |
| From pause mode only: fire restarts, run-stop restarts, clr-home quits the game, f7 "cheese", f8 pause | live | `pause` and `cheese`; fire and RUN/STOP go on rather than restart |
| The status bar's words: Transfer, Mobile, Weapon, Deadlock, Colour, Finish, Captured, Blk-Whte, Console, Burnt Out, Complete, Rejected, Briefing | confirmed | the strings at `$6900`-`$6A22` (`str_*`), printed by `print_string` |
| The robot enquiry pages give each droid's entry, class, height, weight, drive, brain, armament, sensors and notes, written from a dictionary of words | live | `describe` (`$2D92`), `field_value` (`$2F57`) |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| A memory editor, left in the game, that nothing calls | traced | `abmon` (`$0D63`-`$0F0A`); `init_vars` still sets up its variables. The references search finds no jump to it |
| A robot that comes into view when sprites 1-6 are all in use is taken off the ship, with no points | live | `droid_step` (`$18CA`); facts.md, Live tests |
| Every droid's height reads 1.00 to 1.99 m | live | `field_value`, `word_height` (`$6C15`): "1." then the record's two digits |
| The 001 burns out after a little over 8 minutes on its own | live | `alert` (`$3E32`), class 0's mask `$7F` |
| A lost transfer still takes the target off the ship | live | `transfer_done` (`$2260`) |
| The deck is drawn in one colour per character; only the side view and the transfer board switch on multicolour | confirmed | `$6F1C` is `$C0` from `restart`, `back_to_play`, `lift` and `text_page`, `$D0` only from `draw_side` and `transfer`; `$D016` is `$C4` over the deck in a recorded frame of play |
| Holding fire during a transfer makes the robot's side fire as its cursor moves | traced | `opponent` (`$2109`) leaves `$18` as `read_stick` set it |
| A disruptor flash can blow up an explosion again and score 100 points for it | traced | `disruptor` (`$231E`): the energy wraps, and the class is read at `$EA40` |
| The day's scores start at 6809 and 6502 | live | `top_score` (`$E70C`), `worst_score` (`$E710`) |
| Place 13 of the bridge is always the 999 | live | `build_ship` (`$15E8`), `$041D` |
| "VERSION 1.0" kept in memory and never printed | confirmed | `str_version` (`$6E90`): the references search finds no reader |
| The robot's side of the transfer aims at rows 5-8 twice as often as the others | traced | `opponent` (`$2109`) |
| A steep robot shot always shows the up-and-down shape | traced | `aim_shot` (`$34B5`), the second SBC at `$3544` |
| The last robot loaded onto a deck keeps an old pause timer | traced | `load_deck` (`$1664`), the STA at `$16A7` |
| On the 1986 disk an explosion stops at once, unless its speed halves to −1, when it drifts on a pixel a pass | traced | `explosion_step` (`$17F4`): its BEQ at `$1830` and `$1841`, where this disk has BNE and the speed halves each pass |

## Open questions
