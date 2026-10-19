# Zork I — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

Global n is the word at story $20DE + 2n, memory $4D1A for global 30
(`facts.md`, "Memory layout"). The story keeps its words high byte first.

| Effect | Poke | Status |
|---|---|---|
| Opens the way south-west from West of House to the Stone Barrow, which the game opens at 350 points; `west` or `enter` at the barrow then gives the ending at any score | global 30 = 1: $4D1A = $00, $4D1B = $01 | live, from `work/play-west-of-house.json`: the ending printed a score of 0 |
