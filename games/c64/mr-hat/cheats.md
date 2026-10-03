# Mr. Hat — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Rooms 6 and 9 lit, as if room 2's candle had been taken | `$22` = `$40` before the room's set-up runs (`$5E10`, `$7140`) | live: both rooms drawn lit with their objects (`work/goroom.py ... 40`) |
| Go to any room | stop the machine in play, `$4ACD` = the entry code, program counter = the room's set-up (facts.md, "The rooms"), stack pointer `$F0` | live for all eleven rooms (`work/goroom.py`); the room is drawn and runs, but in room 11 Mr Hat would not stay where he was poked, so play after the jump is not guaranteed |
| Immunity for good | `$A877` = `$60` and `$4C52` = `$60`, the `RTS` bytes that `$1250` writes for a while | candidate: what the game's own immunity does, not tried as a poke |
| Title tune silent in room 1 | F1 during play (`$1019` = 1) | live (`work/pausetest.py`); the game's own key, not a poke |
