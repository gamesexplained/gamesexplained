# Kane — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Nine peace tokens | `POKE 36780,9` (`tokens`, `$8FAC`) | live: the shoot-out ran on with the count kept at 9 |
| More time on ride 1 | `POKE 72,1 : POKE 71,89` (`clock_mins` `$48` and `clock_secs` `$47`, BCD: 1.59) | live |
| A train of one coach | `POKE 61,1` (`coaches`, `$003D`, BCD) | candidate: the same byte set to `$19` live made the train get away |
| Ten arrows again | `POKE 36784,16` (`arrows`, `$8FB0`, BCD `$10`) | candidate |
| Start on level 3 | `POKE 36770,2` (`level`, `$8FA2`, 0 to 2) before a stage | candidate: the practice menu sets the same byte |

The pokes are for a monitor or a cartridge's poke menu while the game runs:
the game has no BASIC to type them into.

