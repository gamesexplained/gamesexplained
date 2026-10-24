# Last Ninja Remix — cheats

Pokes that change the game within its own parameters, written as a
monitor would take them (the game runs with no BASIC). Each names the
variable it changes. None has been tested live, so all are candidates.

| Effect | Poke | Status |
|---|---|---|
| Lives | `$03F2` = the number of lives (item 26's flag, which `LoseLife` counts down, `$93C4` in Central Park) | candidate |
| The player's energy back to full | `$0229` = `$2C` (44); the spiral follows a step at a time | candidate |
| End the level at once | `$02AF` = `$FF`, the request the hidden joystick sequence makes; the game asks ARE YOU SURE YOU ARE PREPARED FOR THE NEXT LEVEL if an item the level needs is missing | candidate |
| Set the last lock's code | `$0297`-`$029A` = `$1B` plus each digit, the clock's glyph numbers (`CopyClockToCode`, `$B9B2` in The Basement) | candidate |

The trainer on the cracked copy (`orientation.md`) adds code of its own to
the end of the engine's interrupt (`$1F52`-`$1F6B`, marked in the engine's
listing): a level skip on the ← key, on whatever its options say (and
turned off for the Final Battle), and two `BIT` instructions it turns into
`STA`s for unlimited lives and unlimited power. Those are the crackers',
not the game's.
