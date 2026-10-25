# ACE 2 — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Plane one immortal: it burns no fuel, is never taken away when shot down or crashed, and the side panel says IMMORTAL | `$0975` = 1 (the immortal flag; the high-score table saves it to the disk with the scores) | tested live in the kit's machine: over 300 frames of play plane one's fuel stayed at 247 with the flag set and fell to 245 without it, and the panel printed IMMORTAL |
| The same, from the game itself | enter a name beginning DUSTY BU on the high-score table after a game (`$5634` compares the first eight letters with `$6A30`) | traced in the code, not typed in live |
