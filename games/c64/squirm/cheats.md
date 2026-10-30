# Squirm — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Infinite lives: the death still plays, but no life is taken | `POKE 15412,234: POKE 15413,234: POKE 15414,234` (three NOPs over the `DEC $2685` at `$3C34`) | live: after a death, lives still 3 and all three icons shown |
| Finish the level with the next egg | `POKE 9872,254` (`egg_count`, `$2690`) | live |
| A faster game: each 1 added is one jiffy less per step | `POKE 9865,n` (`step_delay`, `$2689`, normally 250) | candidate: read from the code (`$3C56`); 255 is the fastest that still waits, 0 to 127 no wait at all |
| More lives | `POKE 9861,n` (`lives`, `$2685`), during play | candidate: only the three icons on the bottom line are wiped, so lives above 3 do not show |
