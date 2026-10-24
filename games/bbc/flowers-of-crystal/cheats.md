# Flowers Of Crystal — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The resident integers `A%` to `Z%` are four bytes each from &0404 (`A%`)
up: `B%` &0408, `P%` &0440, `S%` &044C, `T%` &0450, `Z%` &0468. A poke
takes effect at the program's next `RUN`, which every journey and visit
ends with; `work/scripts/jump.py` forces one by patching line 32000 to
keep `A%` and pressing SHIFT-f0.

| Effect | Poke | Status |
|---|---|---|
| Part 1: the next journey starts from another place | `P%` = 0-7 (Centre 0 to Mountains 7), before typing where to go | live (all 56 journeys) |
| Part 2: the next visit goes to place n | `Z%` = 1-10 (1 The Face ... 10 the castle), `A%` not 0 | live (the river, the flight) |
| Part 2: choose the spells held and used | `S%` and `T%`, bit p−1 for spell p (7 holds spells 1-3) | live for 7, 103 and 224 |
| Part 2: every spell held | `S%` = 1,048,575, `T%` = 0 | candidate |
| Part 2: the next flight that survives ends at the castle | `B%` = −1 (&FF &FF &FF &FF); also reached by declining the spell after the river's fee | live |
