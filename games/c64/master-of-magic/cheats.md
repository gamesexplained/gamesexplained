# Master of Magic — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates. Enter them from a monitor or a freezer while the
game runs; addresses are given in hex and decimal.

| Effect | Poke | Status |
|---|---|---|
| Creatures' hits no longer lower body strength, and the pungent potion no longer halves it (the crack's trainer, option 1) | `$24D0`-`$24D2` = `EA E9 00` (9424-9426: 234, 233, 0), turning `SBC $038A` in `$24CC` into `NOP` / `SBC #$00`; `$2DF8` = `AD` (11768: 173), turning `LSR $4EC5` into `LDA` | live: with body 5 and the minotaur on the player's cell, twelve hits left it at 5 |
| Spells cost no mind, the shield's upkeep takes none and the Orcanian potion no longer halves it (the crack's trainer, option 2) | `$2E93`-`$2E95` = `EA E9 00` (11923-11925: 234, 233, 0), in the spell cost; `$3A66` = `AD` (14950: 173), the upkeep's `DEC $4F46`; `$2E02` = `AD` (11778: 173), the potion's `LSR $4F46` | live: MAGIC MISSILE left mind at 30, against 24 without the poke |
| Full body strength | `$4EC5` = 30 (20165: 30) | candidate: the value the new game copies in from `$4E85` |
| Full mind | `$4F46` = 30 (20294: 30) | candidate: the value the new game copies in from `$4F05` |
| The amulet in the right hand | `$4C01` = `$15` (19457: 21), the right-hand slot; add `$3F85` = 0 and `$3FC5` = 0 (16261: 0, 16325: 0) so that the amulet's own location says the player has it, as INVENTORY and WEAR expect | live for `$4C01` alone: with the player on the pedestal cell `$9677`, PUT DOWN won the game. The full poke is checked in the Play tab's port against the game's code |
