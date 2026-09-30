# A View to a Kill — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates. Addresses are in the part named.

| Effect | Poke | Status |
|---|---|---|
| Play City Hall or the mine without the previous code | press RETURN at "PLEASE ENTER CODE" | live |
| Codes: City Hall CCPHJ, the mine DB4CT, the finale ILVCT | type at the prompt | live |
| City Hall: end the part at once (with CCPHJ typed) | set byte 12 of Bond's room record: `POKE` the address in `$3F`/`$40` plus 12 with 1 | live |
| Mine: the bomb's combination | numbered items 6, 7, 1, 3, 4 (`$26F0`) | live, by storing the digits |
| Mine: stop the clock | `$1B80` = 1 (the PAUSE flag) | candidate |
| Paris: repair the car | `$03A1` = 0 (damage, 40 loses) | candidate |
| City Hall: refill Bond's energy figure | `$1B5B` = 42 (the gauge never kills) | candidate |
