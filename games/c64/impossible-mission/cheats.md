# Impossible Mission — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

Addresses are for this image (the Epyx PAL disk, `orientation.md`); a
freezer or a monitor is needed to poke a running game, since RESTORE
restarts it.

| Effect | Poke | Status |
|---|---|---|
| Stop the game clock (the pause button's flag, `clock_stopped`) | `POKE 213,1` (`$D5` = 1) | live: the clock stood still for 300 frames |
| Nine snooze passwords (the digit in the status text) | `POKE 13369,137` (`$3439` = `$89`) | live: the panel shows SNOOZES:9 |
| Nine lift-init passwords | `POKE 13382,137` (`$3446` = `$89`) | live: the panel shows LIFT INITS:9 |
| Freeze the robots and the ball for a while (as a snooze) | `POKE 71,64` (`$47` = `$40`) | live: still for 764 ticks |
| Turn the clock back to twelve o'clock | `POKE 211,0: POKE 212,18` (`$D3` = 0, `$D4` = `$12`) | candidate: the clock's minutes and hours in decimal; not tried |

The pokes a cheat site gives for "cheat mode" and "no opponents" (26831,
27028, 31005, 21006) land in this image's sprites, code and character
set, so they belong to another version and are not listed here
(`features.md`).
