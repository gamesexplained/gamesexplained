# The train — verified technical facts

File S2 (tape 2 side 2), `$2000`-`$9FFF`, entered at `$8000` from the
map's `$0C9D` with the attacker in resident `$0396`. Every address here is
this part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`, stopped on `$8000`.

## The fort's engine on a moving train

- The train runs the fort's code, rebuilt at other addresses: the fighters,
  their poses and controls, the knives and the guards (names carried from
  the fort part where the instructions match, checked against these
  bytes). It has no walls, no dog and no barrel; their variables are kept
  in place and nothing reads them (`$8120`-`$812C`).
- The train is a map of six rows of 240 tiles (`train_map`, `$2610`), shown
  on screen rows 7 to 18 (`train_view_draw`, `$8882`); the locomotive is at
  the map's right end.
- The length and guards by the defender's level (`train_setup`, `$8B50`):
  level 0 starts at column 80 with 8 guards, level 1 at 60 with 10, level 2
  at 40 with 12; the end is column 219 (`$26EB`, `train_progress`, `$8BB7`).
  The time: a pixel every 8 frames, 2,160 frames, about 43 seconds
  (`train_clock`, `$8ADE`).

## The moving scenery

- Three raster bands scroll at their own speeds (`train_irq_sky`, `$8445`;
  `train_irq_far`, `$8475`; `train_irq_train`, `$849B`): the far band of
  scenery on row 4 by 4 pixels a frame and the near band on row 6 by 6
  (`bands_scroll`, `$8CCE`, each from a 120-character strip), and the track
  on rows 19 and 20 a character a frame (`track_step`, `$8CA1`).
- The wheels turn by rewriting twelve characters with one of three frames
  every 2 frames (`train_wheels`, `$899F`); the locomotive's rods are two
  sprites going round with them (`train_rods`, `$8A14`), and the driver in
  the cab is a sprite of two frames (`train_driver`, `$8AAE`).

## Falling off

- Down a ladder to floor 0 puts the attacker on the ground beside the track
  (`climb_down`, `$9477`, `$8DA2`). From then on the scenery stands still and
  the view moves left 4 pixels a frame, so the train pulls away
  (`train_scroll`, `$8955`); 30 columns past him he is beaten
  (`left_behind`, `$8D4D`). Climbing a ladder back on in time stops it.
- A jump that lands on a ladder's character catches the attacker on it
  (`attacker_lands`, `$94B9`).
