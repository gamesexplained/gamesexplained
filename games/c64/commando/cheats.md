# Commando — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Lives | `$0500` = the count, in binary (ten or more shows a graphic in the second digit) | live |
| Grenades | `$04FF` = the count, in BCD (`$25` for 25) | live |
| Score | `$04F9`, `$04F8` = the score in hundreds, BCD, high byte first | live |
| End the area | `$04EF` = 0 in play: no more soldiers come out of the gate, and the area is won once none is left alive | live |
| Unlimited lives (REMEMBER's trainer) | `$0996` = `$AD` and `$1363` = `$AD`: the lost life and the extra life become reads | live |
| No collisions (REMEMBER's trainer) | `$1056-$106D` = `$EA` (24 NOPs over the kill in `$100F`) | live |
| Unlimited grenades (REMEMBER's trainer) | `$2A8F` = 0 and `$3909` = 0: a box adds none and a throw takes none | live |
| No falling into water, pits or trenches (REMEMBER's trainer) | `$3C10-$3C5E` = `$EA` | candidate |
