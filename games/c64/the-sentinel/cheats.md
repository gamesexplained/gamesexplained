# The Sentinel — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Set the energy to n units, 0 to 63; the icons change at the next gain or loss | `$0C0A` = n (`POKE 3082,n`) | live: poked to 2, then H ended the game for want of 3 units |
| The enemies never wake: the Sentinel and its sentries stay still and never drain | `$12E1`-`$12E3` = `$EA $EA $EA` (the `LSR $0CE5` that wakes them becomes three `NOP`s) | candidate |
| Being seen costs no energy: the drain takes 0 units instead of 1 | `$1A16` = `$00` (`SBC #$01` becomes `SBC #$00`) | candidate; the enemy still counts a unit taken (`$1A4F`) and later plants it as a tree, so the landscape gains trees |

No poke is needed to reach a landscape: every secret code follows from
the landscape number (`facts.md`, "Landscape generation"), and
`work/port/landscape.js` gives the code for any of the 10,000.
