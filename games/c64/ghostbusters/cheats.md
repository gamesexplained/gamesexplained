# Ghostbusters — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Purchases, the Marshmallow Man's damage and every other charge cost nothing | `POKE 38454,96` (`$9636` = `$60`: `money_subtract` returns at once) | tested in the kit's simulator (`work/verify/t20-poke-mm.js`): buying the hearse left $10,000, and $10,000 survived a stomp that took the control run to $6,000 |
| Start with $300,000 | name left blank, account number `614` | tested in the simulator (`t11-account.js`) |
| Start with $54,300 | name `STANTZ,RAY`, account number `03452601` | tested in the simulator (`t11-account.js`) |
| Start with $860,000 | name `LEFTY`, account number `LEFTY` (letters count by their low four bits) | tested in the simulator (`t19-letters-trap.js`) |
| Any balance for any name | the How it works page's account-number widget prints the number the game would | the widget is the game's own encoder, checked against it on 20,000 cases |

`POKE 22014,9`, given as "unlimited lives" in cheat lists, does nothing in this copy: `$55FE` is
in the screen at `$5400`, which the start-up clears and rebuilds.
