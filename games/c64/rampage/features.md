# Rampage — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's inlay and instructions, as scanned at the Internet Archive,
  <https://archive.org/details/Rampage_1987_Activision>, read 13 November
  2026 ("the manual" below)
- C64-Wiki (German), "Rampage (Europa)",
  <https://www.c64-wiki.de/wiki/Rampage_(Europa)>, read 13 November 2026
  ("the wiki")
- Wikipedia, "Rampage (1986 video game)",
  <https://en.wikipedia.org/wiki/Rampage_(1986_video_game)>, read 13
  November 2026, for the arcade game this one converts

## Features

| Feature | Status | Where |
|---|---|---|
| Three monsters: George the gorilla, Lizzie the lizard, Ralph the wolf (manual) | live | the newspaper screen (`reference/newspaper-ready.png`); the status line spells the second `LIZZY` (`name_texts`, `$9AE2`) |
| Up to three players: two joysticks and the keyboard (manual) | live | `read_inputs` (`$8F1C`): port 2, port 1, and the keys `,` `/` `@` `:` `=` |
| All three monsters are always in the game; the computer plays the ones nobody joined as (wiki) | live | `ai_input` (`$B380`) |
| Left and right walk along the street or a roof; up and down climb a building (manual) | live | `state_on_foot` (`$8513`), `state_climb` (`$880E`) |
| Fire alone jumps (manual) | confirmed | `walk_or_act` (`$855B`), state 5 (`state_jump`, `$893F`); on a wall fire alone lets go |
| A direction, then fire, punches or grabs that way (manual) | live | `street_punch` (`$86EB`), `climb_punch` (`$888F`) |
| Punching through a building's sides weakens it until it collapses into rubble (manual) | live | `damage_building` (`$A62F`), `collapse_buildings` (`$B281`); only a punch thrown while climbing damages a building |
| Edibles behind the windows increase your energy (manual) | differs | `state_eat` (`$8BFF`) only plays the chewing animation; nothing in the program adds to `energy` (`$9B81`). Live: a monster ate with its energy at 40 before and after |
| Electrical appliances such as toasters and televisions give "nasty surprises" (manual, wiki) | differs | every window thing is handled by the one test in `eat_or_damage` (`$A5BA`), which starts the same animation whatever was eaten |
| Energy bars at the top of the screen (manual) | differs | each monster has the word `DAMAGE`, whose letters turn red from the right as energy falls (`energy_bars`, `$9C62`) |
| A building that starts to give way hurts a monster still on it (manual, wiki) | confirmed | `collapse_buildings` throws the monster into `state_fall`, which costs a hit every step |
| National Guard troops at the windows shoot (manual) | live | `person_fire` (`$9FCE`), `move_bullets` (`$9E68`) |
| Helicopters shoot (manual) | live | `heli_fire` (`$9E26`); only one of the two mid-screen helicopters ever fires |
| You can punch and be punched by your fellow monsters (manual) | live | `punch_monsters` (`$8AA9`), `state_knocked` (`$896D`) |
| With no energy left a monster turns back into a human and walks off the screen (manual) | confirmed | `apply_damage_one` (`$9B9B`), `state_shrink` (`$8995`), `state_walk_off` (`$89B7`) |
| A defeated monster's human can be eaten by another monster (wiki) | traced | `punch_monsters`: a victim in state 10 goes to state 15 and the puncher chews. Not exercised: it needs two monsters side by side at the right moment |
| After eating a defeated monster you can grab and eat again and again on the same spot (wiki, "according to some sources") | open | the eaten monster is parked off screen in state 15, and `punch_monsters` leaves that state alone; no way to repeat the eating was found in the code, and it was not tried in play |
| 50 cities of three days each, 150 screens (manual, wiki) | differs | 20 levels: `end_of_pass` (`$926F`) wraps `level` from 20 back to 0. There are no city names and no day counter |
| Points for smashing buildings, more when one falls; for eating soldiers; for items (wiki) | differs | 100 points for each punch that changes a block (`add_100`, `$98F2`, called only from `damage_building`); nothing else scores |
| Vehicles drive along the street and can be punched (wiki) | confirmed | `new_vehicle` (`$8CA9`), `punch_vehicle` (`$8B40`): cars and tanks are wrecked, a tram drives off faster |
| Climbing goes better with the joystick held diagonally (wiki) | open | `try_climb` (`$85AB`) needs up held beside a wall; a diagonal also walks the monster into the wall. Not measured |
| A title tune | live | `start_tune` (`$AD0B`), the driver at `$0200`; one tune on every text screen |
| Two loading pictures | live | the files `PART2` and `PART6` (`orientation.md`) |

## Beyond the documentation

Found in the code, not in the manual.

- **A second tune that is never played.** The COLLECT ITEMS screen asks
  for tune 1 and the newspaper for tune 2, and `start_tune` begins with
  `LDX #$00`, so both get tune 0. Tune 1's first voice is still in the
  file at `$09E7`-`$0AFF`; the rest of it and all of tune 2 would be read
  from the scenery tables that begin at `$0B00`.
- **Sound effects that never develop.** `update_sound` (`$82AC`), which
  would sweep and end each effect, is never called: twenty `NOP`s sit in
  `irq_top` where the call would go. Effects 3 and 4 of `sfx_records` are
  never started.
- **The third monster cannot be shot.** A bullet that reaches the third
  monster sets the second monster's hit flag (`bullet_hits_third`,
  `$9F66`).
- **Hidden names.** On level 19 with no player joined, the status lines
  read `RHONA`, `I LOVE`, `YOU` (`secret_names`, `$90E4`).
- **Unused text and code.** `MISS YOU`, `CUDDLE WHUMP FLUMP DUNKS`, `THEN
  PRESS FIRE`, `ONE`/`TWO`/`THREE`, `HIGH SCORE`, `GAME SCORE`; a
  high-score table nothing updates; a hex printer; test routines.
- **A weak stretch of road** on three levels only, which gives way under
  a falling monster (`weak_road`, `$9858`).
- **The developer's last game** is still in the building maps at
  `$7500`-`$763F`: lit windows, a broken one, two fallen buildings.
- Slips in the code, each described in `facts.md`: the wreck's second
  frame, the car that reverses, the notch in a raised fist, the colours
  of one screen row, the roof corners, holes that join only one way.

## Open questions

- The disk for North America (1988) is a different program. It was not
  analysed.
- Whether the original passes its protection every time on a real drive
  (`orientation.md`).
