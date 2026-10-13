# Clowns — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The game is a cartridge: its code is in ROM and cannot be poked. These are
RAM pokes, for an emulator's monitor or a freezer cartridge, during a game.

| Effect | Poke | Status |
|---|---|---|
| Player 1's jumps left (`jumps`): any number; the status line shows 0-9 as digits, 10-20 as its reversed letters (10 is a P), and higher numbers as other characters ($40 + the number's low seven bits) | `$0221` = n | live: set to 1 and 0 in two-player tests, and the game counted on from there |
| Player 2's jumps left | `$0222` = n | live: set to 2 and 3 in the same tests |
| The current jump's next fall costs nothing (`bonus_flag`, the bonus jumper) | `$023F` = 0 (player 1), `$0240` = 0 (player 2) | candidate: the game itself clears it when the top row is emptied, and the fall that followed was free (*live*); the poke alone is untested |
| The high score, in tens of points, high byte then low | `$0211`, `$0212` | candidate |
| The C64-Wiki's "`$0221`,`FF`: 255 lives" | `$0221` = `$FF` | the same variable as the first row; with 255 the status line shows character $BF, which falls on clown-shape bytes |
