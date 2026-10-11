# Platoon — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Skips the collision test of the soldier against a list of other figures (`$2BC8`); the game's own key cheat, Z+A+C+H+1 held together, does the same and N undoes it | `$2BC8` = `$60` | candidate: the byte changes live with the keys; the effect in play is not tested |
