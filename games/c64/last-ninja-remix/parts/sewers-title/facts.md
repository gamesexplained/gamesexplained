# The Sewers: title screen — verified technical facts

The level's first load, `$3FF3-$5FFF`, over the engine. Every address here
is this part's. Unless marked *live*, a fact comes from the code in
`work/title.vsf`, the title card on show; `work/entry.vsf` stops where
the loader calls `$4E00` (engine `$1108`).

- `PhaseHandoff` (`$3FF3`): `JMP $7A3B`, the play load's `EngineEntry`,
  where the load coordinator goes once the level is in.
- `PlayNextLoadVector` (`$3FF6`): `JMP $8113`, an `RTS` in the play
  load. Only Central Park's title load points this vector at
  `MachineSetup`, and no title load's copy is ever called: the one
  call, from `StartLevelLoad` (engine `$1405`), comes once as the game
  starts, before any level is loaded, and goes through the engine's
  own `JMP $0E00` at `$3FF6`; the end of a level goes straight to
  `CoordinateLevelLoad` (engine `$16AD`).
- The tune: its player at `$4000` (`$4000` starts it, `$4003` plays a
  frame), the text "COOL REMIX BY REYN OUWEHAND AND PLAYER/SOUNDS BY
  FALCO PAUL" at `$400C`, which nothing reads, the player's working
  variables, then 8 instruments and 14 phrases up to `$4C51`.
- The level's scene header at `$4C52`, which the play load uses: 85
  scene pointers at `$4C95`, each an offset from the header's address
  with bit 15 set for a picture, adjusted once by the word at `$4C53` as
  play starts, and 32 area slots at `$4C55`, each the scene that draws
  an area and its background colour.
- `DrawTitleCard` (`$4E00`) relocates the title's own scene pointers,
  clears the play window and draws area 1's scene, scene 2: the level's
  picture with its name beneath, beside the status panel, with a copy of
  the scene renderer (`$4E0F` on) and a small scene file of
  its own (pointers at `$5228`). The level's second load writes over all
  of it.
