# Fantasy World Dizzy — cheats

## Room browser

Enter **ESPILCE** during play, changing keys in sequence. The input path was checked through the matrix and instruction checkpoints at $3B0A/$3B11. Reaching $3B1D restores the spare-life byte $03B9 to two. In the browser ($3B23) the joystick steps the room number by the table at $3AF0: left -1, right +1, up +16, down -16, kept within $15-$A7; fire returns to play in the room shown. Navigation and fire were used live on 15 November 2026 to reach Daisy's prison and Australia.

## Candidate addresses

| Effect | Address | Status |
|---|---|---|
| Spare lives | $03B9 | Initialised to two; secret-path store verified live. |
| Room ID | $03E5 | Traced through drawing and transition routines; arbitrary changes require rebuilding the room. |
| Coin tens and units | $18E5/$18E6 | Traced at $3997 and $3A30; forced-count tests outstanding. |
