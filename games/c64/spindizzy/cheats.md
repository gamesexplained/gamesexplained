# Spindizzy — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The counters are binary-coded decimal: each byte holds two digits, the
low byte first.

| Effect | Poke | Status |
|---|---|---|
| The game's own cheat: the time never goes down | Before the game starts, write "I LIED!" (`$49 $20 $4C $49 $45 $44 $21`) into the RAM at `$DF00`-`$DF06`, under the I/O chips, from a cartridge or a monitor; `check_cheat_password` ($6076) then writes RTS over `add_to_time` | live (`work/scripts/live1.py`) |
| The same, in play | `$9533` = `$60` (POKE 38195,96): RTS over `add_to_time`'s JMP, which every loss of time passes through | live: it is the byte the password writes |
| Set the time to 150 | `$5F` = `$01`, `$5E` = `$50` (POKE 95,1: POKE 94,80) | live, as `$5E` = `$01`, `$5F` = 0 (time 001) |
| Set JEWELS | `$39`, `$38`, e.g. `$02`, `$20` for 220 | live (`live4.py survey`) |
| Set TO MAP | `$3B`, `$3A`, e.g. 0, `$01` for one room left | live (`live4.py survey`) |
| Move Gerald to any room | Write the room's map row and column to `$4C`, `$4D`, the cell X, Y and level to `$4F`, `$51`, `$53` (`$4E`, `$50`, `$52` = 0), then `$4B` = `$E0`: he falls far enough below the floor that `apply_velocity` restarts him at that "last safe place", for 5 of the time | live (`live4.py`) |
