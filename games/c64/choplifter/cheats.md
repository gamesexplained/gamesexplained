# Choplifter — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Open all four sheds at once | `POKE 3316,1 : POKE 3317,1 : POKE 3318,1 : POKE 3319,1` (`$0CF4`-`$0CF7`) | live: the shed bodies switch to shape 72 and their people start coming out |
| Start on the second or third sortie | `POKE 3327,1` or `POKE 3327,2` (`$0CFF`) | candidate |
| Raise the difficulty, which lets jets and mines appear | `POKE 141,3` (`$8D`) | candidate; the caps at `$A3B2`/`$A3B6` are read every spawn |
| Fill the helicopter | `POKE 3313,16` (`$0CF1`) | candidate |
| Count hostages as delivered | `POKE 3310,n` (`$0CEE`); the game ends when `$0CEE + $0CEF` reaches 64 | candidate |
| Silence the game | `POKE 54296,0` (`$D418`) | live: the raster handler does not rewrite it, so it stays silent until the next pause |
| More shots in the air at once | `POKE 3315,0` every frame (`$0CF3`, the in-flight count `$97DE` compares with 5) | candidate |

The two counters that matter for the ending are `$0CEE` (delivered) and
`$0CEF` (lost). `$967C` tests their sum against `$40`.
