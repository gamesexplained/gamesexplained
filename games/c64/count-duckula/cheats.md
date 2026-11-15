# Count Duckula — cheats

## BURN THE WITCH

Release all joystick directions and fire, then type `BURN THE WITCH` followed by a space. The fourteen-byte recogniser at $42D2 sets $F0=1; ordinary left/right closed-door collision calls are skipped at $36E0/$372A. The game code and C64-Wiki agree on the phrase; the final space is part of the stored sequence at $42C4. This is a traced recogniser, without a recorded full game route.

Typed in play on the kit's machine model, the phrase also turns every sprite dark. Until it is typed, the main loop at $24D2 waits on $F0; afterwards it stores black into Duckula's three colour registers ($D027-$D029) and the two shared sprite colours ($D025/$D026) over and over. The shared colours are the white and black of every sprite, so mummies, doors and objects lose their white too. Discoveries shows room 66 before and after.

The run selected no trainers and used controlled state fixtures only for verification.
