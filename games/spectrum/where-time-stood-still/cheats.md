# Where Time Stood Still — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Hear the second tune, which the game never plays: the sound driver takes it as a request | `POKE 28674,1` (`$7002`, the driver's request byte) | live: in ZEsarUX the AY's registers then followed sections 1 to 3 (`facts.md`, Sound) |
| Jump to the last day of the month: at the next midnight the calendar turns | `POKE 36116,31` (`$8D14`, the calendar's day) | live: from the start of play, with the clock's count (`$BF2A`) also set to `$2FF0`, the panel turned to MAY 1 (`discoveries.html`, 01) |
