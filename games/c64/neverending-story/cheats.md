# The NeverEnding Story — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Strength full | `$2930` = 50 (`$32`), counter 1, the value the resident turn script gives it at the start ($1C6F) | candidate: traced in the turn script, which ends the game when the counter reaches 0 |
| Light in every room | `$2916` = 1, flag 7, which the glowglobe keeps set while carried ($1C6F) | candidate: traced; a dark room prints its description only while flag 7 is set ($107E), and four turns without it end the game |

## Playing this copy

With the crackers' loader, any restart after Part 2 has loaded (a death,
QUIT and Y, or the win) fills memory with the wrong part (Discoveries).
To play on, reset the machine and load the disk again. SAVE and LOAD do
nothing in this copy.
