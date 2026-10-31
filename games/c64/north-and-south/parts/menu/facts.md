# The menu — verified technical facts

Files OC and OM (tape 1 side 1), `$1000`-`$ABFF` and `$F632`-`$FFF9`,
entered at `$1000` by the resident's script. Every address here is this
part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`, stopped on `$1000`.

- A cursor sprite moved four pixels a frame by joystick 2 or by P, L, Z and
  X, between x 30 and 320 and y 60 and 224 (`cursor_move`, `$16D1`); space or
  fire clicks one of twelve places (`menu_click`, `$19B9`; edges
  `$10F1`-`$112D`; routines `$10D9`), with 20 frames before another click
  counts.
- The places: each side's window (a person or the computer, resident
  `$0382`/`$0383`), each side's head (the level, resident `$0380`/`$0381`,
  0 to 2, shown by the head's sprites, `$1018`, `$101B`), the three
  disasters (resident `$0384`-`$0386`), arcade or strategic (resident
  `$0387`), the joystick panel (resident `$0388`, only when one person
  plays), the calendar (resident `$0389`), the photographer (a flash), and
  GO.
- The first time (resident `$037F` at 0) the defaults are set
  (`$1878`): 1861, the disasters off, the joystick, the Union a person at
  level 2, the Confederacy the computer, the arcade on. Later visits draw the
  panels from the settings as they were.
- The panels are eighteen pictures drawn into nine windows of the bitmap
  (`panel_bitmaps`, `$1048`; `panel_dest_bitmap`, `$10B4`).
- The sound player the later parts use is loaded with the menu
  (`$F632`-`$FFF9`), and the map keeps it (map part, `$F128`).
