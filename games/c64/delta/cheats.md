# Delta — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| 7 credits for the next shop | `$107C` = 7 | live: the affordable icons turned light blue and icon 4 could be bought |
| Every weapon at once | `$0F00`-`$0F06` = 1 (speed 0-3, fire rate 0-2) | live: one press fired the laser, the three-way burst, both beams and the orbiter (`reference/weapons-poked.png`) |
| Skip to the next stage | `$129B` = 1 during play | live: stage 1 ended and ENTERING ROCKS OF DEATH / STAGE 02 began |
| Lives | `$12CB` = 1-9 | candidate: the variable was confirmed live by diffing a death (3 → 2); the poke itself was not tried |
| The trainer left in the code | `$0EF2` = `$00`, `$0EF3` = `$BA` (joystick; `$0EF8`/`$0EF9` for keys) | candidate: turns `JMP ship_move` in `irq_controls` into `JMP $BA00`, so `unreached_cheat` runs each frame: F3 refills the lives, F5 toggles harmless enemy fire; not tried |
