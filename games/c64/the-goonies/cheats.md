# The Goonies — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Start a new game at any scene | `POKE $12BC` with the scene index (0 hideout, 2 lake, 1 pipes, 3 rocks, 4 eggs, 5 cage, 6 octopus, 7 ship, 8 the ending), then press F7. `new_game` (`$0868`) starts at `$12BC`, which only the cold start (`$0846`) writes | live: every scene snapshot in `work/` was made this way in VICE, 7 October 2026 |
| Lives left | `POKE $12B7,n` (0 to 9). `goonie_dying` (`$0BD3`) takes one at each death and ends the game when it goes below 0; the LIVES digit is printed from it when a scene starts | traced; the scene snapshots hold 5 there and show LIVES 5 |
| Infinite lives | `$0BDA`-`$0BDC` (`DEC $12B7`) to `EA EA EA` | tested on the kit's 6502 machine (`kit/c64/machine.js`) from `work/play-scene1.vsf`, 8 October 2026: a Goonie set dying restarts the scene with 5 lives left, 4 without the poke |
| Run without the copy-protected loader's `$EF` in `$00` | `$0B38` (`BNE $0B3D`) to `EA EA`, so the hidden check in `goonie_active` always returns | candidate: follows from the code at `$0B2D`; not tried |
