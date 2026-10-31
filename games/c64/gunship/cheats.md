# Gunship — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Unlimited ammunition: the store is read but never counted down | `POKE 23082,189` (`$5A2A`, `use_store`'s `DEC $53D8,X` becomes `LDA $53D8,X`; from the C64-Wiki) | tested in the simulator on `play-flying-we`: five calls with X = 0 leave the cannon's 60 rounds at 60, where the game takes them to 55 |
| No fuel used | `POKE 22840,5:POKE 22885,5` (`$5938`, `$5965`: the fuel burn subtracts `zpa_05`, which is 0 in flight, instead of the burn `zpa_A0`) | *live*, `play-flying-we`: both tanks unchanged after 6 seconds, where the game burns 126 from each |
| Not for this build: the C64-Wiki's "no fuel use" | `POKE 22837,5:POKE 22882,5` | *live*: in this build those are the operands of `LDA zpa_70` and `LDA zpa_72`, so the tanks are set from `zpa_05` less the burn, and they fall faster (136 and 339 in 6 seconds). The wiki gives it for another build, as it does its damage immunity, whose addresses here are the middles of other instructions |
