# Speedball — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Your players are brought down by a slide only once in 256 tries | `$1EB9` = 255 (`tackle_side0`) during a match | simulated: `test_rules.js` runs `tackle_resolve` with every random byte, and a figure of 255 lets only byte 255 through; not tried live |
| The computer's players fall to almost every slide | `$1EBA` = 1 (`tackle_side1`) during a match | simulated, as above: every byte but 0; not tried live |
| Tokens to buy everything in the shop | `$1EB1` = 255 (`tokens_side0`) before the shop | candidate: `tile_token` counts up to 255, and the shop spends from it |
| The match clock back to full | `$76` = 40 (`clock_target`) during a match | candidate: `clock_step` takes a bar off it every 112 passes and full time comes when the drawn bar reaches 0 |
