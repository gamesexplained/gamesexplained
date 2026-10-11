# Valhalla — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The addresses are those of the arrays as the tape loads them. They stay
put in play: the headers of `p$`, `c$`, `m$` and `s$` were at the same
addresses in every play snapshot, and what the program makes in play goes
after them.
Rows: `c$(n,i)` is at $BC2B + 20 × (n − 1) + (i − 1), `p$(n,i)` at
$BAF7 + 3 × (n − 1) + (i − 1).

| Effect | Poke | Status |
|---|---|---|
| A ring in your pack, for ringways (`jump`) | $BC2E (48174) = 85, `c$(1,4)`; $BAF8 (47864) = 5, your load, `p$(1,2)` | live: the route to Felstrong's cave |
| The key in your pack | $BC2F (48175) = 80, `c$(1,5)` | live: "You are not strong enough to open the cupboard." at location 6 |
| Food and an axe in your pack | $BC2E (48174) = 96, $BC2F (48175) = 63 | live: both used as weapons |
| A character's strength now | `c$(n,20)`: Idun (14) at $BD42 (48450) | live: five fights against Idun |
| Your strength now | $BC3E (48190), `c$(1,20)`; up to 255 | candidate |
| Characters stop acting: none leaves, takes, gives or attacks | $8B4B (35659) = 189: `PEEK` becomes `ABS` in line 4060, which then always returns | live: used for the fights |
| Nobody is sent away from a crowded place | $95B7 (38327) = 108, 99: `k3` becomes `lc` in line 5512 | live: used for the fights |
