# The Living Daylights — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Start on any level | At a stopping checkpoint on `$110C` (the call of the level intro), write the level, 0 to 7, to `$012E`; 8 shows the ending | live: used to reach and screenshot all eight levels |
| More lives | Write the number of lives to `$0150` (`new_game` sets 5) | candidate: the variable is traced, the poke not tried |
| Full energy | Write `$77` to `$012F`; the bar is redrawn at the next hit (`draw_energy`) | candidate |
