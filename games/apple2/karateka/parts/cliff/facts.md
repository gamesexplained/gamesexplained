# The cliff (stage 1) — verified technical facts

Stage 1, loaded over the title after the castle picture: the hero climbs
onto the cliff, and guards come out of the gates one after another until
he reaches the palace door. Every address here is this part's unless it
is named as the engine's. Unless marked *live*, a fact comes from the
code in `work/entry.json` (stopped at $BFFA).

## The stage

- `cliff_start` ($B700): both fighters' records, the arrows' recovery
  intervals and the recorded sound's speed at 30, the scroll at $30, 14
  arrows for each fighter ($B0, $B1), headgear 0 and its chances
  (`guard_chances`, $BB63), and the climb from picture $0B. The climb's
  pictures are drawn two a frame (`climb_frame`, $BB31; `climb_picture`,
  $B683) until it ends, then the tune at $1009 plays, then the main loop
  runs `cliff_frame` ($B7CA) and the engine's frame end, for ever.
- The cliff is two screens. `scroll` ($B260) keeps the hero near column
  $0F, the scroll ($52) running from $30 down to $1B on the first screen
  and from $0B down on the second. With a guard coming on, a hero at
  column $21 or more takes the scene to the second screen ($B2EC); on the
  second, at column $2A or more he has reached the end: $D0 = 2, and the
  palace is loaded on a frame drawn on page 2 ($B874).
- With no guard coming on, a hero who reaches column $2A of the first
  screen asks for the cut to Akuma ($AF), the engine's scene in which a
  guard is sent (engine $79A6).

## The guards

- Each guard wears the next headgear, up to 5, and takes its chances of
  a kick, a punch and a step forward from `chance_kick`,
  `chance_punch` and `chance_step` ($BB75, $BB7B, $BB81); the next comes
  once $82, set when the last lies dead, has counted to 20 ($B7CA).
- `cut_gate` ($B40C): the camera moves to the gate ahead while the guard
  runs out of it, until he stands at column 4 + 4 × his headgear; then
  back to the hero, with the guard's column $2C less. `cut_run`
  ($B4BB): while a guard runs on out of sight, the camera runs with him.
- Each guard beaten while the hero's most arrows are 10 or more takes
  one from the hero's most and gives one more to the next guard ($B874).
- The brain's thresholds by distance are at $BFE1-$BFFD (`brain_t1` to
  `brain_t4`).

## The edge

- `edge_draw` ($B0C6) draws the cliff's end on the first screen when the
  scroll is $23 or more: the sea, the cliff's top, the rock face and the
  ledge below.
- A hero whose column on the screen falls below $0B on the first screen
  has stepped off it: $A2 is set (`hero_move`, $BA91), and the next frame
  starts the fall ($B8BD: $A1 = $1F, the hero no longer alive, legs pose
  $13). `fall_step` ($AC3F) draws the falling pictures while $A1 counts
  to $23, and at $30 the hero is dead; the death tune and THE END follow
  three frames later ($B7CA). *Live*: `reference/cliff-fall.png`.

## The scenery

- `draw_background` ($B015): the sky down to row $67, the rail, the
  mountain's top, the floor's four colours from row $99 to $B4.
- The gate the hero passes (`gate_draw`, $AE7A) is 18 pieces, mirrored
  when it is left of column $14 ($AE3F), with its near post drawn again
  over the figures (`gate_front`, $AF4D); the gate ahead, seen in the cut
  to a guard, is 17 more (`far_gate_draw`, $BC65). Each is covered where
  it was drawn two frames before ($AF76) before the page is drawn on.
- `keep_frame` ($B5BA) keeps each frame's positions for the page drawn
  two frames later.

## Tunes

`stage_tunes` ($1000), five JMPs: the four notes as Akuma's chamber is
shown ($1000), the hero's death ($1003), a guard beaten ($1006), the tune
after the climb ($1009) and Akuma raising his arm ($100C). The tunes are
at $1040-$110B.

## Left in memory

After `chance_step` ($BB81), the end of $BB52, a copy of $BB63 with its
tables, and a filler pattern to the end of the page, from an earlier
build.
