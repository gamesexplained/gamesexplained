# Hot Dog Aerials — verified technical facts

File `H`, `$1000`-`$6CFE`, over the menu. Every address here is this
part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`.

## The run

- States in `$11`: 0 set up (`hd_setup`, `$128F`), 1 the run (`hd_run`,
  `$1370`), 2 after it; the run's steps in `$36` count down: in-run (4),
  kicker (3), take-off (2), arms up (1), in the air (0), and 5, judged
  (`run_steps`, `$1387`).
- The skier moves in 8.8 fixed point with a fraction, gravity added to
  the vertical speed each frame (`move_skier`, `$1604`).
- In the air, the stick picks a move from `air_script` (`$172B`): up-left
  the Daffy, up-right the back scratch, down-left the mule kick,
  down-right the swan, right the forward flip, left the back flip.
- A move's held pose is clean when it is held 10 to 19 frames; any other
  hold is awkward, counted in `$39` (`step_script`, `$14B2`). A flip held
  goes round again and counts as a second move the same as the first
  (`script_back`, `$151C`).
- At the snow (Y 181), a good landing needs the stick centred and the
  arms-up pose; anything else is one of four falls, chosen at random, and
  no score (`in_air`, `$1393`).

## The marks

- `judge` (`$17FF`), in tenths: no move 0; one stunt 6.3, one flip 7.2;
  of two moves (only the first two count) the same stunt twice 8.7, two
  different stunts 9.6, the same flip twice 9.2, two different flips or a
  stunt and a flip 10.0; then 1.4 off for each awkward move.
- Each of eight judges adds a random -0.1 to +0.2 to that, except to 0
  and 10.0 (`judge_marks`, `$185D`); the total is their sum over eight
  (`judge_total`, `$18C2`), which replaces the player's best when it is
  higher.
- A mark of 9.0 or more gets the crowd's cheer, sound 10.

## Sound

The six-slot engine (`start_sound`, `sound_step`) with 31 sounds in
`snd_table` (`$69A7`): sound 0 the tune, 4 the judges' tick, 5 to 8 the
moves, 6 an awkward move, 9 a landing, 10 the cheer, 11 to 14 the falls,
15 the push off. `S` with joystick 2 held down switches every sound off
and on (`snd_s_key`) (*live*).
