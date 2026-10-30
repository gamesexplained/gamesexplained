# The Fourth Protocol — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Episode three starts without episode two | type TIPTREE at the codename screen (`codename_answer`) | tested live |
| Episode two: the taxi goes straight to the Faslane estate | say BOMB at WHERE TO? in a London taxi (`taxi_destinations`) | tested live |
| Episode two: money (one byte, pounds) | `POKE 16463,n` (`money`, `$404F`) | tested live: set to 60 before the Treasury's authorization, which left 4 |
| Episode three: the lines typed so far; the bomb goes off at 144 | `POKE 34714,n` (`commands_typed`, `$879A`) | tested live: 143, then an empty line set the bomb off |
| Episode one: prestige (two bytes, low first; below 50 ends the game) | `POKE 6457,lo : POKE 6458,hi` (`prestige`, `$1939`) | candidate |
| Episode three: the bomb defused | `POKE 34692,128` (`bomb_state`, `$8784`) | candidate |

A poke is made in the emulator's monitor while the episode runs: the
game banks the KERNAL and BASIC out, so there is no `POKE` from BASIC.
