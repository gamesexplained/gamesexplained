# Classic Adventure — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The game has no cheat of its own. These pokes take effect at the next
command, so make them while the game waits for a typed line.

| Effect | Poke | Status |
|---|---|---|
| Go to room n (1-140); the next command that describes the room shows it | `$0CA3` = n | live: used for every room test in `facts.md` |
| Put object n in room r, or 0 with bit 1 of its flags set to carry it | `$8AA0` + 2n = r, `$8AA1` + 2n = flags | live: the score, bear and troll tests |
| Count of objects carried, which the limit of 7 is tested against | `$0C96` = n | candidate: set to match the objects poked into the hands, not tested on its own |
| Dark descriptions left before the pit, 4 at the start | `$0C99` = n (not 0) | candidate: read live, never poked |
| Lives left after this one, 4 at the start | `$0CAD` = n (0-9, one ASCII digit) | candidate |
| Close the cave at the next visit to the hall of mists | `$0CA0` = `$FF` | candidate: set live by the game's own `SCORE`, not by a poke |
