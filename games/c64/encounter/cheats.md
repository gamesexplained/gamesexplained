# Encounter — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Nine shields | `POKE 24614,146 : POKE 24615,147` ($6026/$6027 = wide-font digit 9, codes $92/$93) | tested live: the status row reads S9 at once; the count is the screen cell itself, so the poke is the whole cheat |
| Next kill ends the level | `POKE 35752,1` ($8BA8 = 1, the BCD enemies-remaining counter) | tested live in the attract demo: the next kill opened the stargate and added a shield; the E counter redraws on the next kill |
| Start at any level | no poke needed: press 1 to 8 on the title screen | tested live; the check against the highest level reached is patched out at $9CE3 |
| Start at level n from BASIC | `POKE 168,112-16*(n-1)` ($A8 = level index, $70 = level 1) before F7 | candidate: this is what the number keys write, not tested as a poke |
| Slower saucers | lower the skill's enemy-speed column at $8F88 (`POKE 36745,x` for Novice) before starting | candidate: the level start copies it to $17A2 |
| Wiki: `POKE 30430,0` or `POKE 34722,0` for invulnerability | $76DE and $87A2 | not tested; both addresses hold data in this image (sprite frames and maths tables), so these belong to another version |
