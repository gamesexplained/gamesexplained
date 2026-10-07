# Armalyte — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The game runs with BASIC and the KERNAL switched out, so a poke goes in
through an emulator's monitor while the game runs. A freezer cartridge
that uses the stack is caught at the next level's start: the game finds
the stack page changed and wipes itself (engine `stack_check`, `$AFAE`).
Addresses are the engine's.

| Effect | Poke | Status |
|---|---|---|
| Player 1's lives, 0-15 (player 2's at 45062) | `POKE 45061,9` (`$B005`) | live: nine lives, and the game went on |
| Super weapons cost nothing, so they fire with no charge | `POKE 62598,0: POKE 62599,0: POKE 62600,0` (`$F486-$F488`, the three costs) | live: with no charge, held fire sent super weapon A across the screen; without the poke it did not |
| Four generators for player 1 (player 2's at 45081) | `POKE 45080,4` (`$B018`) | candidate; each load takes two away |
| A full battery in each of player 1's four slots | `POKE 45072,7` to `POKE 45075,7` (`$B010-$B013`) | candidate; each load takes two away |
| The wiki's "cheat mode" | `POKE 59891,173` (`$E9F3`) | does not work: the anti-cheat check (`$F77D`) sees the changed `DEC` and hangs the machine (live: within five frames) |
| The wiki's "unlimited energy" | `POKE 53792,96` (`$D220`) | does nothing: with the I/O chips in, `$D220` is the border colour, already black (live) |
