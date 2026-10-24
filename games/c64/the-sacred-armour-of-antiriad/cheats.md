# The Sacred Armour of Antiriad — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Radiation never drains Tal on foot: `energy_tick` subtracts 0 instead of the room's level (`zp_radiation`) every 50 frames | `$8ACB` = `$E9`, `$8ACC` = `$00` (`sbc zp_radiation` becomes `sbc #$00`) | *Live*: with the room's level set to 3, Tal's energy went from 31 to 1 in 500 frames, and with the poke stayed at 31 |
