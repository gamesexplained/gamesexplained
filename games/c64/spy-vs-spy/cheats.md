# Spy Vs Spy — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| More traps: the trapulator refuses a trap once the spy's count passes twice the rooms less one; holding the count down keeps it handing them out | `$85` (white) or `$86` (black) = 0 | tested: with the count poked to 10 the trapulator gave a bomb on level 1, with 11 it refused (`work/scripts/t4.py`) |
| More time: a spy's clock minutes, in BCD | `$93` (white) or `$94` (black) = `$59` | candidate |
| Fewer club hits taken: the hits counted towards a knock-out (ten) | `$020E` (white) or `$020F` (black) = 0 | candidate |
| Music off without the S key | `$0263` = 1 | tested: S flips this byte, and the driver skips both voices while it is set (`t1.py`) |
| The recording mode the attract demo was presumably made with: both joysticks are written into the demo tables | `$6603` = 1 before the options screen | candidate |
