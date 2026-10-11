# Gribbly's Day Out — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Psi never falls, so running out of psi never ends a level | `POKE 24345,234 : POKE 24346,234` (`$5F19`-`$5F1A`: `psi_bar`'s `DEC $57` becomes two `NOP`s; collisions still lower the target `$58`, which the bar no longer follows down) | Tested live, 9 October 2026 (`work/py/live_cheat_psi.py`): from level 0's play snapshot, psi's target set to 0, 300 frames: psi stayed at 40 and `level_over` never ran. The same without the poke: psi drained and `level_over` ran once. |
| Bank full | `$59` = 255 (`POKE 89,255`), the most the bank holds | Candidate, untested |
