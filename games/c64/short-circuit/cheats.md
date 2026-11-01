# Short Circuit — cheats

Pokes that change the game within its own parameters. Each one names the variable it changes and whether it has been tested live. Untested pokes are labelled as candidates.

| Effect | How | Status |
|---|---|---|
| Start part two without playing part one | On the attract screens press **F3** (key 5 of the matrix, tested by `$95BF`); F1 starts part one without the intro (`$95B5`) | live: F3 started the countryside with the clock at 6:00 |
| Pause the game | Press **F7**; press it again to go on | live: the clock stopped while paused |
| Give up a game | Press **F5** while playing | live: the attract mode came back |
| Full energy | Poke `$029A` and `$029B` to 6 | candidate: the cell counts the bars start from (`$2602` start values); not tested |
