# Qix — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| The current level asks for only 1 % (level_params reloads `$B8` at each level, so poke it during play) | `POKE 184,1` (`$B8` = 1) | live: a 6 % claim ended level 1 |
| Lives left for the current player (`lives` at `$026E`, read by life_lost and draw_lives) | `POKE 622,5` | candidate |
| Lives at the start of a game (`$1567`, copied to `$026E` by new_game) | `POKE 5479,5` | candidate |
| The most lives an extra life can raise you to (`$1566`) | `POKE 5478,9` | candidate |
| The timer bar never stops being redrawn (`timer_limit` at `$91D9`, reloaded each level) | `POKE 37337,255` during play | candidate |

The game runs with BASIC and the KERNAL banked out, so a POKE means a
freezer cartridge or the emulator's monitor.
