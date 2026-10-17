# Jet Set Willy — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live.

| Effect | Poke | Status |
|---|---|---|
| Restores the room-select cheat: ↑ alone, then F, A, C, E and S one at a time, turn the border white, and two digits choose a room, tens 0-5 and units 0-9 | `POKE 7100,165` ($1BBC = $A5, the first byte of the cheat's routine, which the game ships as an RTS) | *live*: ↑ FACES 5 7 took Willy to room 57, The Beach (`facts.md`) |
