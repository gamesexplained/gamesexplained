# Choplifter — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Wins the game: the crowns and the end | `rescued` = 64: `$730B` = `$40` | live, from `work/play-sortie1.json`: the game ended with the crowns |
| Sets the level, 0 to 3: how many of each enemy may be in play | `level`: `$731D` = 0-3 | candidate; the game's own CTRL-L, then the digit, sets it live (`facts.md`) |
| Three more helicopters | `helis_used` = 0: `$731C` = `$00` | candidate: the game ends when a lost helicopter's countdown finds it at 3 (`next_sortie`, `$0B9B`) |
