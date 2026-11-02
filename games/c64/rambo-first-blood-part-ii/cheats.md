# Rambo: First Blood Part II — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Energy never drains: `energy_tick` returns before taking damage | `$0C89` = `$60` (RTS) | candidate, not tested |
| Every weapon from the start | `$19ED` = `$3F` after `game_init` | candidate, not tested |
| No enemy bullets | `$24E1` = `$60` (RTS at `enemy_fire`) | candidate, not tested |
