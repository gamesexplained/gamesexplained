# Ski Jump — verified technical facts

File `J`, `$1000`-`$7AFE`, over the menu. Every address here is this
part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`.

## The jump

- Three rounds in competition, each player's best total counting
  (`next_round`, `$1199`; `store_scores`, `$11E4`).
- Down the in-run the skier follows `ramp_points` (`$1A5D`). Past X 255,
  on the lip, fire takes off; fire before the lip does nothing, so a
  button held from the start takes off on the lip's first frame
  (`ph_inrun`, `$1545`) (*live*). With no fire 30 pixels past the lip,
  the take-off is missed: a tumble and no score (`ph_missed`, `$1779`).
- In flight a drift tips the lean on one of two axes, drawn at random
  with its direction (`drift`, `$179A`); the stick pushes it back, two a
  frame, three against the drift's direction (`flight_steer`, `$1600`).
  The lean's band, nine of them, picks the close-up's pose
  (`lean_bucket`, `$17E6`).
- The flight lasts until its speed has fallen from 60 to 40; the
  distance adds up the speed each frame, and the speed falls by the
  lean's drag: 14/256 a frame centred, up to 21 at the edges
  (`flight_distance`, `$184E`; `drag_table`, `$18AA`). A centred lean
  gives the longest jump.
- Landing in the centred pose is good; any other pose falls
  (`flight_land`, `$1686`).

## The score

- Style starts at 20 (`sj_setup`, `$131F`). Coming back to the centre
  costs 0, 2, 4 or 8 by the worst lean since the last return
  (`lean_penalties`, `$16DA`). A good landing leaves at least 6
  (`ph_runout`, `$16EE`); a fall takes 18 more, to no fewer than 0
  (`ph_fall_stop`, `$1745`).
- The score is three times the distance plus the style points
  (`show_score`, `$18BC`). The distance points are worked out from the
  whole distance, fraction and all, so a jump shown as 68.6 metres scored
  205.9 (*live*: 68.6 m, 205.9, 20.0 style, 225.9 in all).

## Sound

The six-slot engine (`start_sound`, `sound_step`): sound 0 the tune, 5
the in-run, 6 the wind in flight, 7 a good landing, 8 a fall, 9 a missed
take-off; after the run-out, sound 11 with a fanfare and claps for a jump
of 62 metres or more, sound 10 for a shorter one. `S` with joystick 2
held down switches every sound off and on (`snd_s_key`).
