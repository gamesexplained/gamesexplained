# World Games — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Weightlifting: choose any weight, in 5 kg steps | `$38` = the weight over 5, while the weight is chosen (`wl_choose_weight`, `$13B7`) | live: 230 to 250 kg read their factors from `$1482`; 865 kg (`$AD`) stops the processor |
| Barrel jumping and bull riding: the hidden credits | the first two players named AUTHOR and OFTHEGAME, or those names poked into `$0800` and `$0820` | live |
| Slalom: a head-on flag hit bends the flag | `$70` at 100 or more as the hit is checked (`sl_flag_hit`, `$F371`) | live, for one hit: `$70` counts on every frame |
