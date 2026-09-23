# Little Computer People — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| His mood: 0 happy, 1 content, 2 sad (`$035F`); picks his face and adds 3, 1 or 0 to every request's score | `POKE 863,0` | tested: the face changes at once (`reference/moods.png`), and a request without "please" scored 7 instead of 4 |
| Make him ill: illness level 1–4 (`$0365`); at 3 or more he goes to bed, and he turns green | `POKE 869,3` | tested: green at the next tick; recovers at once unless food and water are gone too |
| Empty the kitchen cupboard (`$30B4`, one bit per packet), so CTRL F works and letters complain | `POKE 12468,0` | tested: CTRL F then starts the delivery; the letter becomes the complaint |
| Fill the kitchen cupboard | `POKE 12468,15` | tested: this is how the game starts, and CTRL F is ignored |
| Water in the tank, 0–11 lines (`$2B51`) | `POKE 11089,11` | tested: CTRL W stops at 11; 0 with an empty cupboard makes the complaint letter |
| Hunger and thirst, 0–3 (`$0371`, `$036E`); at 3 an illness starts on the next rise | `POKE 881,3` / `POKE 878,3` | tested, together with the illness poke: he goes for food and water first |
| The house hour, 0–23 (`$0379`); 3 rings the alarm, 23 starts the evening list | `POKE 889,2` | candidate: from the code (`$09EB`, `$0BB2`), not tried |
| Choose the next piano piece: stop at `$AB1F` and set A to 0–3 (Mozart, unidentified, Für Elise, Bach) | a breakpoint at `$AB1F` in the emulator's monitor, then set the A register | tested: this is how each piece was recorded |
| Choose the next record tune: stop at `$AB14` and set A to 0–3 | a breakpoint at `$AB14`, then set the A register | tested: tune 2 is tune 0 upside down |

The addresses are in RAM that the game reads with I/O in (`$01` = `$35`),
so a poke from the machine-language monitor of an emulator works while the
game runs; there is no BASIC to type `POKE` into while the game is going.
