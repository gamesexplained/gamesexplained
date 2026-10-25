# Central Park: title screen — verified technical facts

The level's first load, `$3FF3-$60BF`, over the engine. Every address here
is this part's. Unless marked *live*, a fact comes from the code in
`work/title.vsf`, the title card on show; `work/entry.vsf` stops where
the loader calls `$4E00` (engine `$1108`).

- `PhaseHandoff` (`$3FF3`): `JMP $8EAD`, the play load's `EngineEntry`,
  where the load coordinator goes once the level is in.
- `PlayNextLoadVector` (`$3FF6`): `JMP $0E00`, `MachineSetup`, the same
  jump the engine's own load leaves here. `StartLevelLoad` (engine
  `$1405`) calls this vector once, as the game starts and before any
  level is loaded, so the call goes through the engine's copy and this
  one is never called. The later levels' title loads point it at an
  `RTS`.
- The tune: its player at `$4000` (`$4000` starts it, `$4003` plays a
  frame), the text "MUSIC BY R. OUWEHAND AND PLAYER BY F. PAUL" at
  `$400C`, which nothing reads, the player's working variables, then 12
  instruments and 19 phrases up to `$4DE3`.
- The start of the level's scene header at `$4DE4`, which the play load
  uses. This load holds only `$4DE4-$4DFF`: the count (118), the word at
  `$4DE5` and the first 12 of the 32 area slots at `$4DE7`, each the
  scene that draws an area and its background colour. The other slots
  and the 118 scene pointers at `$4E27`, each an offset from the
  header's address with bit 15 set for a picture, adjusted once by the
  word at `$4DE5` as play starts, come with the play load; in this load
  `$4E27` is code of `DrawTitleCard`.
- `DrawTitleCard` (`$4E00`) relocates the title's own scene pointers,
  clears the play window and draws area 1's scene, scene 4: the level's
  picture with its name beneath, beside the status panel, with a copy of
  the scene renderer (`$4E0F` on) and a small scene file of
  its own (pointers at `$5228`). The level's second load writes over all
  of it.
- Left over at `$6000`, named by no instruction, vector or pointer: a
  routine that saves the zero page to `$8000`, draws the title card,
  prints PRESS FIRE TO CONTINUE (`$6050`) and waits for port 2's fire,
  with a raster interrupt at `$60A0` that calls `$4002`, which in this
  tune is the high byte of the `JMP` at `$4000`, `$40`, an `RTI`: it was
  written for a player whose entry points lay elsewhere.
