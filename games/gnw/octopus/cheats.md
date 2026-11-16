# Octopus — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| No diver is ever caught | hold any key of the R2 row (the board's "Invincibility" pad; `R2.K1` in the kit's wiring) | live, 12 November 2026: catch_check $01C0 skips the check |
| Held left or right repeats | the same R2 pad | live: right held 2 s took the diver to the chest |
| Both spare divers back | `$1004` = 6 (lcd_04 bits 1 and 2) | live |
| Score near a bonus | `$1015`-`$1017` = 1, 9, 9 with a spare lost (`$1004` bit 1 clear), then a point | live: the bonus at 200 |
