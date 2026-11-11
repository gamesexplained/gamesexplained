# Stop the Express — practice and inspection

## Built-in controls

Press **C during attract play** to start practice ($2155). Practice freezes
the clock and routes ordinary damage to the flashing spare-life indicator.
Escape leaves practice ($218B). M mutes title music; RUN/STOP pauses and
fire resumes. These controls are also explained on the authored pages.

## Debug state changes

These were applied to the running game in plus4emu, not entered as BASIC
POKE commands while its ROMs were paged out.

| Effect | State change | Status |
|---|---|---|
| Practice flag | $7E = 1 before the collision/timer routines | Tested with native code and in emulator stage setup |
| Inspect stage two | Set round $4A = 2, enter the native common interior setup at $2844, stop at $2860 | Tested live; reference/play-interior.png |
| Inspect engine approach | During interior practice, set $75 = 2*$7D-1 and $74 = 22, run to $2860 | Tested live; native approach sets player (37,17) and $3F=1 |
| Force round-zero initializer | Set $4A=0, call $51F5 | Tested live; corrupts code through $24FF and places $FF at $2500; use a disposable snapshot |

Forced setup is evidence about a routine's behaviour, not evidence of a
legal route through the game. No untested lives/score poke is proposed.
