# Fist II: The Legend Continues — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Lives | `$2D32` = n (1 at the start) | candidate (1 read live) |
| Hero's energy and its limit | `$0412` = `$7F`, `$0485` = `$7F` | candidate (47 read live; 127 is the game's own cap) |
| Scroll n found / delivered | `$0404`+n = 1 / `$80` | candidate |
| Pause | RESTORE, or `$0416` = 1 | live (RESTORE) |
