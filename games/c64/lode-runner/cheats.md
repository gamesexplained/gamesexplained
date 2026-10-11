# Lode Runner — cheats and diagnostic pokes

These controls belong to the Black Label disk engine. The IRQ's modifier tag also accepts other active modifiers with the same letter. Ordinary commands are traced at $7A10 and their dispatched handlers.

| Control | Effect | Verification |
|---|---|---|
| Ctrl-F | Add a life, saturated at 255; disqualify score | Live command-latch dispatch: 254→255→255, eligibility cleared |
| Ctrl-U | Skip board; disqualify score | Traced; life increment wraps at 256 rather than saturating |
| Ctrl-Z | Toggle room-reveal animation | Traced |
| Ctrl-D | Reverse joystick-fire drill polarity | Traced |
| + / − | Lower/raise pacing threshold within 3–8 | Traced; default threshold-five cadence measured live |

## Diagnostic state changes

Restore a private play snapshot, pause on a stable PC, and apply these before the named routine reads them. They are tests of engine state, rather than new player-reachable cheats.

| State | Address/value | Evidence |
|---|---|---|
| Stored score | $130A–$130D: four packed-BCD bytes, low pair first | Live $87E6: +250 and eight-digit wrap; 1624 CPU cases |
| Gold remaining | $130E: zero enables exit processing | Forced $8D96 test; backing-blocked exits stay pending |
| Lives | $1312: unsigned byte | Live Ctrl-F saturation; new-game reset to five traced |
| Pacing threshold | $131B: 3–8 | Live five gives 144 IRQs/72 passes in 120 PAL frames |
| Hole timer | $12E0 + slot: 180 after digging, zero inactive | Forced opening/refill; all 181 countdown values CPU-tested |

Filling every hole slot before forcing a completed dig leaves a cleared brick without a timer. A replay proving that a player can fill all 30 slots is absent, so this is an open corner case. Changes to physical board index $1310 and displayed level $1305 must be made before room construction; changing either after loading mixes state rather than selecting a complete new board.
