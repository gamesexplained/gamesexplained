# The fort — verified technical facts

File S1 (tape 2 side 2), `$2000`-`$9FFF`, entered at `$8000` from the
map's `$0C8F` with the attacker in resident `$0396`. Every address here is
this part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`, stopped on `$8000`.

## The scroll

- The courtyard is a map of nine rows of 400 tiles (`fort_map`, `$2718`, a
  row every 400 bytes), each tile 2 × 2 characters (`fort_tiles`, `$2318`).
  The view is 40 of the 44 columns of a buffer at `$2000` (18 rows) shown on
  screen rows 3 to 20 (`show_buffer`, `$882F`); the fine scroll moves 3
  pixels a step (`$80FE`), and every two characters the buffer shifts and a
  new tile column is drawn at the edge (`scroll_right_step`, `$865A`;
  `draw_tile_column`, `$870D`).
- The attacker stays at x `$64` on the screen; walking moves the view, and
  the guard, the dog and the barrel are moved with it (`$9887`, `$98B9`,
  `$98EB`).
- The fort's length and guards come from the defender's level (`fort_setup`,
  `$89B7`): level 0 starts the view at tile column 200 with 8 guards, level 1
  at column 80 with 10, level 2 at column 4 with 12; the end is column 379
  (`$2893`, `fort_progress`, `$8A26`), where the scroll stops and the
  attacker has won.

## The fighters

- Each fighter is two sprites, the upper and the lower half, in ten states
  (`fighter_state`, `$8BDD`; poses `$8CC1`): standing, walking, jumping or
  ducking, the sabre stroke, the throw, climbing, dropping, beaten, down,
  knocked over. The Confederacy's pictures are 60 pointers after the
  Union's (`pose_uniform`, `$8CF9`).
- Fire next to a guard (on the same floor, the guard up to 30 pixels to the
  right) is a stroke; farther, a knife, four in all (`fighter_strike`,
  `$957F`; `fighter_throw`, `$95D3`). A stroke knocks the guard over with a
  random number below `$14` at its second-last frame (`attacker_strike`,
  `$91F8`); the guard's knocks the attacker over below `$1E`
  (`guard_strike`, `$9C91`).
- A knife flies 8 pixels every 2 frames and knocks over a fighter that is
  standing, walking, striking, throwing or in a jump before its last
  crouch, so a duck lets it pass (`knife_hits`, `$9A63`).
- Up climbs a ladder (character `$10` in the row below his head, `ladder_up`,
  `$93BA`) to the walkway (floor 11) or jumps; down climbs down (`$12`,
  `ladder_down`, `$9439`) or ducks. Walls (`$80F7`) knock the attacker back
  (`wall_right`, `$9241`).
- The computer's guards throw without counting their knives (`guard_fight`,
  `$9BAA`, reads `$8116` only for a person's guard), so they never run out.

## The rest of the fort

- The guards come one at a time from the right, onto the attacker's floor
  for the computer and onto the floor a person's defender pushes for
  (`guard_start`, `$9D02`).
- The dog runs on every 150 frames with a chance set by the defender's
  level (15, 20 or 30 in 256, `dog_start`, `$92EF`) and knocks over a
  fighter on the ground within 24 pixels (`dog_bites`, `$973D`).
- A barrel rolls in every 60 tiles the view moves to the right
  (`barrel_start`, `$9968`) and explodes on a fighter on the ground
  (`barrel_hits`, `$96B2`).
- The time: the clock sprite moves a pixel every 14 frames, 3,780 frames
  (about 76 seconds) in all; then the attacker is beaten and `$0397` is 0
  (`fort_clock`, `$8945`). The boot sprite shows the progress
  (`fort_progress`, `$8A26`). At the end the flag comes down and goes up
  again in the attacker's colour (`flag_change`, `$8B9C`).
