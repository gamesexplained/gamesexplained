# Rick Dangerous — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| The game's own cheat: 2 fills bullets, dynamite and lives to six, C= skips to the next level | `POKE 83,255` (`$53`), or enter BBOOIINNGG in the Hall of Fame | the poke tested live on 12 October 2026; the name traced at `$2155`, not typed |
| Lives | `$2D34` = 1 to 6 | candidate (read from the code; the cheat's refill writes 6 here) |
| Bullets | `$2D32` | candidate |
| Dynamite | `$2D33` | candidate |
