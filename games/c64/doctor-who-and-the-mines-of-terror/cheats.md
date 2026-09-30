# Doctor Who And The Mines Of Terror — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates. The file is packed, so these are made in a machine
code monitor or an emulator while the game runs, not before `RUN`.

| Effect | Poke | Status |
|---|---|---|
| Lives: *n* figures, *n* lives before GAME OVER | `$1E` = *n* (5 at the start; the field shows up to five) | live: 2 poked, one death left one figure |
| Score | `$57`-`$59`, six BCD digits, high byte first | live: `12 34 56` shows 123456 |
| Full Splinx battery | `$1F` = 24 | candidate (24 read live at the start) |
| Air | `$F1` = 50 | candidate (`$CA90`) |
| Time bonus | `$1B`-`$1D`, BCD, low byte first | candidate (`$91BC`) |
