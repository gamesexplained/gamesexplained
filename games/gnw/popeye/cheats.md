# Popeye — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| No miss is counted | hold any input of the R2 test row (MAME: "Infinite Lives") | live (`work/tools/cover.js`, the cheat phase) |
| Clear the miss marks | `$1004` bits 0-1 and `$1006` bit 0 to 0 | candidate |
| Start at a score, for the bonus | `$1015`-`$1017` = the digits | live (`work/tools/s9.js`) |
