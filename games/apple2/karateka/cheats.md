# Karateka — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Every doorway in the dungeon or Akuma's chamber opened at once | $C5 = 6 | live: each room of `reference/stages.js` is reached with it, and `test_stages.js` holds the pictures to Apple2TS |
| The hero taken on to the next screen or room | $62 = $21, at a flip of the page shown | live, as above |
| The opponent left with one arrow | $B7 = 1, as the unused handler at engine $7742 does | candidate |
