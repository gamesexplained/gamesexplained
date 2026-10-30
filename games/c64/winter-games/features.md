# Winter Games — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Epyx, *Winter Games* instruction manual for the Commodore 64/128 (part
  number 089Q7D-S0 rev. A), the OCR text of archive.org's scan,
  https://archive.org/details/Winter_Games_1985_Epyx, read 29 October 2026
- C64-Wiki, "Winter Games", https://www.c64-wiki.com/wiki/Winter_Games,
  read 29 October 2026 (controls and point tables per event, the nations,
  the versions, the Figure Skating "cheat")
- Wikipedia, "Winter Games", https://en.wikipedia.org/wiki/Winter_Games,
  read 29 October 2026 (credits, release dates, reception)
- The game's own screens, from this run's emulator sessions

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen: "EPYX presents WINTER GAMES by Action Graphics, © 1985 Epyx, Inc." | live | part `title` |
| Opening ceremony: the torch bearer climbs the steps and lights the flame, doves fly, flags fly | live | part `opening` |
| Menu of seven options: compete in all, some or one event, practise one, number of joysticks, world records, opening ceremonies | live | part `menu` |
| Up to eight players, each typing a name and choosing one of 18 countries by its flag; `S` plays that country's anthem | traced | part `menu`: `name_entry` ($39DA); `entry_fire` moves to the question after the eighth player and plays the anthem of the flag in the frame for `S` or fire; `country_codes` ($3CD1) holds the 18, one of them Epyx's own flag |
| A verification screen after the names (YES/NO, or `Y`/`N`) | traced | part `menu`: `entry_state` step 5 and `ask_correct` ($1585): "IS THIS CORRECT?", A) YES, B) NO, chosen with the pointer or the keys A and B (`choose_option`); not `Y`/`N` |
| Compete in some events: events chosen by number key or joystick, shown in white, DONE to finish | traced | part `menu`: `opt_some_events` ($114A): a chosen event turns white and sets its bit in $089D-$089E, chosen again turns back; DONE with none chosen returns to the main menu; letters A to G choose as well as the stick |
| Number of joysticks: 1 (port 2) or 2 (ports 2 and 1) | traced | part `menu`: `opt_joysticks` ($0FE8) switches $087D; each event's `read_stick` reads port 2 with one joystick or for odd-numbered players, port 1 for the others |
| World records: the best score in every event, with the holder's name and country, saved to the disk | traced | parts `menu` and `resident`: `opt_records` ($11F2), `check_record` ($1865) and the loader's `ldr_save_records` ($0934), which writes the 256 bytes at $0E00 to track 18 sector 13 of side 1; saving was not exercised |
| Awards ceremony after each event: every competitor's name, country and score in order, the gold medallist's anthem | traced | part `menu`: `show_results` ($174B), `give_medal` ($14C3), `show_winner` ($17BD); players with the same score share a place, a score of 0 shows as FAULT |
| Champion ceremony after all seven events: gold 5 points, silver 3, bronze 1; the most points wins | traced | part `menu`: `work_out_totals` ($1481) and the final standings in `compete` ($1077) |
| RUN/STOP with RESTORE returns to the menu from anywhere, asking for side 1 when side 2 is in | live | part `resident` |
| The disk's other side is asked for by name ("INSERT WINTER GAMES SIDE 2") | live | part `resident` |
| **Hot Dog Aerials**: fire starts the run; six stick directions are six moves (back flip left, forward flip right, Daffy up-left, back scratch up-right, mule kick down-left, swan down-right); centre lands | traced | part `hot-dog`: `air_script` ($172B) maps the six directions as the manual says; a landing is good only with the stick centred in the arms-up pose (`in_air`, $1393) |
| Hot Dog scores: 1 stunt 6.3, 1 flip 7.2, 2 same stunts 8.7, 2 same flips 9.2, 2 different stunts 9.6, a stunt and a flip 10.0, 2 different flips 10.0; 1.4 off for each awkward move; no score for a fall | traced | part `hot-dog`: `judge` ($17FF) gives exactly these; only the first two moves count; each judge adds a random -0.1 to +0.2, except to 0 and 10.0 (`judge_marks`) |
| Hot Dog judges: eight countries' marks and a total under them (URS, YUG, FRG, ITA, SUI, GDR, USA, CAN seen) | live | part `hot-dog` |
| **Biathlon**: left-right rhythm skis; faster on the uphill; stick down when the arms are forward double-poles on the downhill | traced | part `biathlon`: `stroke_dirs` ($2E50) left or right on the flat and uphill, down on the downhill; a stroke's power builds 8 a frame on the flat and at once uphill (`power_steps`) |
| Biathlon shooting: five targets at each range, stick down opens the chamber, up loads, fire shoots; the heart rate (PULSE) moves the sights; 5 seconds' penalty a miss; 20 shots shown at the start | traced | part `biathlon`: `rifle` ($6F89), `shot` ($6FEC), `sight_move` ($6F51) with `heart_table`, `score_penalty` ($2FF5), `draw_shots` (20 less hits and misses); four ranges |
| **Speed Skating**: two skaters side by side, "PRESS YOUR BUTTON" for each, a countdown to GO, left-right rhythm, 250 metres; a computer pacer when one player | live | part `speed-skating`: `ready_set_go` ($A18C), the stride states (`stride_left`, `stride_right`); the course's signs count 25 to 225 and FINISH stands where 250 would be (`course_row`); the pacer (`pacer_stick`, $A267) is rubber-banded to the player (`pacer_adjust`); a time of 3:00 is a FAULT |
| **Figure Skating**: one minute, seven compulsory moves (camel spin, sit spin, double and triple axel, double and triple lutz, camel into sit spin) | live | part `skating`: `sk_setup` sets the clock to 1:00.0; it counts a tenth every six frames (`clock_tick`), so on this PAL release the minute lasted about 72 seconds of real time (tested live) |
| Figure Skating points: camel .7, sit .7, double axel .6, triple axel 1.1, double lutz .6, triple lutz 1.1, camel into sit 1.2; total 6.0; only the first of each counts | traced | part `skating`: `figure_points` ($1DCB) and `base_mark` ($1CFA), which counts each element once |
| Figure Skating penalties: the manual says .7 a fall and .2 an awkward move; C64-Wiki gives other figures | differs | part `skating`: `base_mark` takes .2 an awkward move and .7 a fall, as the manual says, but tests each subtraction with a signed branch, so from 19 to 28 falls the penalty wraps round and the mark is 6.0 (tested live with 22 falls); C64-Wiki's other figures are Free Skating's |
| Skating rules: a jump is elegant or awkward by the legs' position when fire is pressed; six turns of a spin; falls from jump to spin, spin to jump, jump to jump, sit spin to camel; skating backward when time runs out is a fall | traced | part `skating`: the stick tables (`forward_sticks` $1713, `backward_sticks` $1870, `camel_sticks`, `sit_sticks`): a move is clean on its stride frames and shaky otherwise; a spin left with its count of turns other than 7 (`spin_turns`) ends awkwardly and its eighth turn falls; time up while skating backward is a fall. How the count of 7 matches the manual's six turns on screen is open |
| **Free Skating**: two minutes, the same seven moves up to three times each; per attempt camel .3, sit .3, camel into sit .5, double jumps .2, triple jumps .4; ceiling 6.0, with falls and awkward moves taken off the ceiling too | differs | part `skating`: `free_points` ($1DD3) and `free_mark` ($1D5C) as the manual says, but the fall penalty is .5 a fall and a tenth more, with no fall at all too (a missing SEC), so every Free Skating mark below its ceiling is a tenth low: one camel into sit spin scores .4 (the game's own `base_mark` run in the simulator) |
| The C64-Wiki "cheat": falling at every flag gives 6.0 in Figure Skating | live | part `skating`: 22 falls (stick down with fire) and nothing else scored 6.0 from all eight judges; 40 scored 0.0. Any 19 to 28 falls with no element give 6.0 (`base_mark`, signed test) |
| **Ski Jump**: fire starts the run and jumps at the take-off; in the air the corner close-up shows the fault to correct: knees bent (up), too far forward (left), too far back (right), skis crossed (down) | traced | part `ski-jump`: `ph_inrun` ($1545) takes off on the lip only (fire held from the start took off there, live); `drift` and `flight_steer` ($1600) tip the lean on one of two axes, which the stick pushes back; a fall comes from landing in any pose but the centred one |
| Ski Jump score: distance × 3 + style points | live | part `ski-jump`: `show_score` ($18BC); a jump of 68.6 m scored 205.9 distance points (three times the distance before it is rounded) and 20 style points, 225.9 in all |
| **Bobsled**: fire starts, left and right steer; capsizing in the turns; a speed bar; the track map beside the view | live | part `bobsled`: `steer` ($4382) left and right, down or fire brakes; ten frames against a wall (`check_walls`, $42D3) is a crash, which records 99.99; `speed_bar` ($4C24); `plot_dots` on the map |
| Practice: no scores kept | traced | part `menu`: `opt_practice` ($0FFE) runs the event for one player called CONTESTANT and clears the player count afterwards; no results or records |
| "PLAY AGAIN? YES" after an event in practice | live | every event |

## Beyond the documentation

Found in the code, not in the manual.

- Figure Skating's penalties are subtracted and tested with a signed
  branch, so 19 to 28 falls and nothing else score 6.0 from every judge
  (part `skating`, `base_mark`; live). This is the C64-Wiki's cheat.
- Free Skating's marks are a tenth low below the ceiling: the fall
  penalty's subtraction has no SEC before it (part `skating`, `free_mark`).
- Every event's clock counts six frames to a tenth, the rate of an NTSC
  machine; on this PAL release the clocks run a fifth slow, so Figure
  Skating's minute lasts about 72 seconds (live).
- `S` with joystick 2 held down switches every event's sounds off and on;
  `S` alone does nothing (parts `hot-dog`, `biathlon`, `ski-jump`,
  `skating`, `bobsled`, `sound_step`; live in Hot Dog). Speed Skating's
  older sound engine has no switch.
- The menu holds the names of nine Summer Games and Summer Games II
  events, and a switch ($087F) that would offer them; nothing sets it
  (part `menu`, `opt_more_events`).
- In Bobsled the runners' rumble writes a random number into the far
  view's sky at $878A every frame, a speck in far pieces 21 to 25; a
  crash leaves the whistle's voice switched off until the run ends; a
  wreck that slides over the line records the clock's time, not 99.99
  (part `bobsled`; each live).
- Speed Skating's computer pacer is rubber-banded: its skill rises while
  the player leads and falls while it leads (part `speed-skating`,
  `pacer_adjust`).
- Each Hot Dog and Skating judge adds a random -0.1 to +0.2 to the base
  mark, except to 0 and to the top mark (parts `hot-dog`, `skating`).
- The loader's file table has a twelfth record, number 2, named `?`,
  which nothing was seen to load (`orientation.md`).

## Open questions

- Who programmed the C64 version: Wikipedia names Richard A. Ditton
  (artists Lonnie D. Ropp and Michael Kosaka, music David Thiel); C64-Wiki
  names Chris Oberth, whom Wikipedia credits with the Apple II version.
  The title screen says only "Action Graphics".
