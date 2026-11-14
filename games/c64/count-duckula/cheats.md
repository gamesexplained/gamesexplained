# Count Duckula — cheats

## BURN THE WITCH

Release all joystick directions and fire, then type `BURN THE WITCH` followed by a space. The fourteen-byte recogniser at $42D2 sets $F0=1; ordinary left/right closed-door collision calls are skipped at $36E0/$372A. The game code and C64-Wiki agree on the phrase; the final space is part of the stored sequence at $42C4. This is a traced recogniser, without a recorded full game route.

The run selected no trainers and used controlled state fixtures only for verification.
