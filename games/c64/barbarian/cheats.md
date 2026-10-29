# Barbarian — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| The computer's fighter falls dead at the next blow that lands | `$94` = 1 (`strength` + 1, the right-hand fighter's), during a bout | live: `work/ending1.py` held it at 1 to win the level 7 bout on side 2 (29 October 2026, VICE v3.13.2) |
| The player's fighter at full strength again | `$93` = 12 (`strength`, the left-hand fighter's) | candidate: `show_strength` draws the half circles from it each pass, and `hit_effect` counts down from it |
| Skip to the last bout of the tournament | side 2, `$BE` = 7 (`level`) before a bout; win it and the ending starts | live: `work/ending1.py`. Poked in the throne room, the ending first swaps to the hall of arches (`start_ending`) |
| Reach Drax at once in the ending | side 2, `$71` = 28 (`column`, the barbarian's) while the stars fly | live: `work/ending4.py`; Drax vanishes and Mariana comes down |
| Show the unused figure of Mariana | side 2, `$CB` = 3 (`scene_number`) while the ending runs | candidate: `scene_sprites` reads the record `$CB` names on the next pass; `drax_throws` sets it back to 0 or 1 while Drax throws, so it holds only after `reach_drax` |
