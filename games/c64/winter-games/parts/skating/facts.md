# Figure Skating and Free Skating — verified technical facts

File `F`, `$1000`-`$79FE`, over the menu. The loader enters it at `$1000`
for Figure Skating and at `$1005` for Free Skating, which store 0 or 1 in
the mode at `$70`. Every address here is this part's. Unless marked
*live*, a fact comes from the code in `work/entry.vsf`
(`work/entry-free.vsf` for Free Skating).

## The program

- The clock starts at 1:00.0 for Figure Skating and 2:00.0 for Free
  (`sk_setup`, `$12FF`) and counts down a tenth every six frames
  (`clock_tick`, `$1DE3`): on this PAL release the minute lasts about 72
  seconds (*live*).
- When the time is up, skating forward ends the program with a bow
  (`mv_bow`, `$1835`); skating backward, it is a fall (`backward_sticks`,
  `$1870`).
- Moves are records (`start_move`, `$15F0`) chained by stick tables: a
  fresh press of fire reads the stick as a code and looks it up in the
  current move's table (`stick_moves`, `$1554`). Skating forward, up and
  right is a double axel, down and right a triple, fire turns backward,
  and up, down and the left diagonals fall (`forward_sticks`, `$1713`).
  Skating backward, up is the camel spin, down the sit spin, up and left
  a double lutz, down and left a triple, right turns forward, and the
  right diagonals fall.
- A take-off or a spin's entry is clean when fire is pressed on the
  stride's glide or the frame after it (stride frames 0, 1, 6 and 7
  forward, 2, 3, 8 and 9 backward), and shaky, an awkward move, on the
  others.
- A spin turns until fire; left after any count of turns but 7
  (`spin_turns`, `$167F`) it ends awkwardly, and its eighth turn's end is
  a fall. Down during the camel spin makes it the camel into sit spin
  (`act_combo`, `$1694`).
- A jump lands clean when fire is pressed in the air at or after its
  count (82 for the lutzes, 73 for the axels), awkwardly when earlier,
  and falls when it is not pressed (`land_choice`, `$14D9`).
- The list of elements at `$4A` has no bound: past 30 it runs on into the
  variables from `$68` (`act_record`, `$1652`).

## The marks

- Figure Skating (`base_mark`, `$1CFA`): each element counts once, in
  tenths camel spin 7, sit spin 7, double axel and double lutz 6, triple
  axel and triple lutz 11, camel into sit spin 12 (`figure_points`,
  `$1DCB`); then 2 off for each awkward move and 7 for each fall; at most
  60, and at least 4 for each element counted.
- The two subtractions are tested with BPL, a signed branch, so a result
  from 128 to 255 counts as below zero and anything the subtraction wraps
  round to below 128 stands. With no element, from 19 to 28 falls the
  mark wraps to 61 or more and is cut to 60: 6.0 (*live*: 22 falls scored
  6.0 from every judge; 40 falls scored 0.0). With all seven elements and
  no awkward move, any 27 to 36 falls give 6.0.
- Free Skating (`free_mark`, `$1D5C`): each element up to three times, in
  tenths 3, 3, 2, 2, 4, 4 and 5 (`free_points`, `$1DD3`); then 2 off for
  each awkward move and 5 for each fall plus one more, with or without a
  fall, because no SEC comes before that subtraction. The ceiling is 60
  less 2 for each fall and 1 for every two awkward moves; then at least 2
  for each element counted. Below the ceiling every Free Skating mark is
  a tenth low: one camel into sit spin and nothing else scores 0.4 (the
  game's own `base_mark` run in the simulator).
- Eight judges add a random -0.1 to +0.2 each, except to 0 and 6.0, and
  the total is their sum over eight (`judges`, `$2DE2`).

## Sound

The six-slot engine (`start_sound`, `sound_step`): sound 6 the Figure
Skating music and sound 0 the Free Skating music, which plays once
(`tune_free`, `$556D`); 9 the judges' marks, 3 the applause. `S` with
joystick 2 held down switches every sound off and on (`snd_s_key`).
