# Power Drift — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| The time bonus pays 256,000 points | `$53E0` = `$45` (the race clock's seconds, in BCD) after the player crosses the line in a podium place and before BONUS appears, while the clock is stopped (`race_frame_loop` runs `race_clock` only before the finish) | tested live with `$20`: the bonus showed 25 and paid 37,000 points, as `test_bonus.js` predicts; `$45` is from the code (`show_bonus`, `count_bonus`) |
