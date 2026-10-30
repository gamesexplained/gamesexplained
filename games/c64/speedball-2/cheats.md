# Speedball 2 — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| The game's own cheat: + adds 100 to the bank, T, G and F act in a match (`facts.md`, "The cheat" in the game part) | `POKE 3088,1` ($0C10 = 1), or type BRADFORD-ON-AVON on the title screen | live (typed) |
| 9999 in the bank | $0AB3 = $99 and $0AB1 = $99 (decimal digits) | candidate |
| A longer clock for the half under way | $4D = $99 (99 seconds, decimal) | candidate |
