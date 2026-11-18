# Turrican — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| The whip's length, in steps: 16 at the start, up to 40 with blue symbols; 0 reaches the screen's edge | `$036F` = 0 to 40 (engine `whip_update`, $391B) | tested live: 40, 16, 2 and 0 (`facts.md`, Live tests) |
