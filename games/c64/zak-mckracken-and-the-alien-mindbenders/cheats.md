# Zak McKracken and the Alien Mindbenders — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Everything moves faster: the main loop waits fewer frames between passes | variable 25, the speed, at `$FE87`: 3 for twice as fast, 1 for as fast as the program goes (6 at the start) | live in the bedroom: 199 passes of the main loop in 600 frames at 3 and 492 at 1, against 100 at 6 (`work/verify/t_cheat_speed.py`); whether a script sets it again later was not looked for |

The rest of the game's state, the money on the CashCard among it, is in
the scripts' variables (`$FE6E` and `$FD6F`), and which variable holds
what is in the scripts, which are not decoded.
