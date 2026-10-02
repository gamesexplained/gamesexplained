## 0.0.8 · 22 September 2026 · Jupiter Lander · air with Claude Fable 5.1

**A poke proves the code, an input movie proves the player.** The scoring
section claimed a climbing landing pays more than a perfect stop, on the
strength of a velocity poked at a breakpoint. Asked whether a ship can
actually arrive climbing, the answer from the loop's order of tests was
no on two pads and yes on one, and the perfect stop itself turned out to
be unreachable. The verify skill now separates the two kinds of evidence
and says how to get the second: model the movement routine exactly, search
it for an input sequence, replay the sequence with the game's control read
patched to a table, compare every pass.

**Look for the state the programmer never meant to be reached.** The
minisite and coverage skills now name the shapes it takes in code, exact-match
tests, sign assumptions, eight-bit wraps, test order, and ask for a stepper
the reader can walk through once one is found and flown.

**Do not step a game loop with stopping checkpoints.** Resuming after a
stop did not work through the tool, and alternating two checkpoints ran two
passes per step. The vice-mcp notes carry the control-read patch that
replaces stepping, and the attract-mode trap that made an input look dead.
