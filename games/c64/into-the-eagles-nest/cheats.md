# Into the Eagle's Nest — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

## The game's own cheat

The Play tab has it as a switch, with its three parts as switches of
their own (`play.html`, "Cheats"; `test_cheats.js` holds them).

The game has one of its own, and it is not a poke. When a floor is built,
`$6F3B` compares the ten characters of the name last typed on the high
score screen with the word stored at `$6F31` and, if every one matches,
sets `$603F`. While that byte is set the game:

- never lets the player take a hit (`$63A6` turns `$639F` away),
- keeps a door key in hand, written back every frame (`$5BD1`),
- fills the ammunition back to 99 on two frames in three (`$5BB4`).

The word is **`%MAGGOTS!&`**, ten characters, every one of them on the
name-entry screen's own alphabet strip. So the way to use it is to score
enough to reach the table, type it as your name, and play on.

Tested live on 26 October 2026 (`work/cheattest.py`): with those ten
characters in the name buffer at `$081F`, a mission starts with `$603F` =
1 and a key in hand; without them `$603F` is 0 and the player has no key.

| Effect | Poke | Status |
|---|---|---|
| No hits, a key in hand and full ammunition | `POKE 24639,1` (`$603F` = 1) | live, through the game's own cheat word |
| Set the hits, which kill at 50 | `POKE 710,<BCD value>` (`$02C6`) | candidate: the comparison at `$5BC8` is with `$50`, and the byte is binary-coded decimal |
| Set the ammunition | `POKE 701,<BCD value>` (`$02BD`) | candidate, read by the panel and the shot |
| Set the keys | `POKE 684,<BCD value>` (`$02AC`) | candidate |
