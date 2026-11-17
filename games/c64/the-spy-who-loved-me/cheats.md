# The Spy Who Loved Me — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Infinite lives | `$0BAF` and `$0BB0` to `$EA` (two NOPs over `DEC $44`) | live: with the armour set to 0 the car crashed and the lives stayed at 3 (`work/spy-after1.vsf`) |
| Lives | `$44` | the count `after_death` tests; candidate |
| Q tokens | `$6A`/`$6B`, BCD (`$99`/`$01` gives 199) | live: the shop sold torpedoes for 15, leaving 184 |
| Full armour | `$96F0` to `$FF` | live |
| Sub capability | `$65` to `$FF` | candidate: what `hit_ramp` tests |
