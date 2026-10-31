# The Incredible Hulk — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Every treasure in the fuzzy area, so SCORE gives the password and wins | the location byte of items 4, 12, 16, 18, 19, 29-32, 35, 37, 42, 44, 46, 48, 50 and 51 (`$1C3C` + 2 × item) to 16 | live |
| The tester on: every action that runs prints " DID:" and its number | type T at the prompt (`$1F14` = 2) | live |
| Leave the game for BASIC | put `$FF` in the keyboard queue at the prompt (`$0277` = `$FF`, `$C6` = 1) | live |
