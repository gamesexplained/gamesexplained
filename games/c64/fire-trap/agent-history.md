# Fire Trap — agent history

- 10 November 2026: installed VICE v3.14.0 (nine runtime libraries unpacked into `tools/vice-libs`, no root) and regenerator2000 0.9.20 (needs `--locked`). The disk is a Triad crack: intro, trainer, then a second-stage unpacker at `$0816` whose last instruction jumps to `$0900`. Trainer keys must be held about two seconds.
- The stack at the trainer's key wait led to its code at `$C984`; after RETURN it patches the cheat bytes and jumps to `$0816`.
- Joystick: the game reads both ports (`$12` is port 1, `$13` is port 2); during the first playtest the fire and direction presses in the attract loop did not start a stage the way expected, so the controls are traced from code, not observed.
- 10 November 2026: the first snapshot was taken with both trainer options on, so the hand-over held the cracker's patches at `$1CEF` and `$2CE8`. A live test (lives did not drop, the timer did not run) showed it; the game was booted again with both options off and every later fact comes from that snapshot.
- The vertical position `$44`/`$45` was first labelled as height; a live test showed that climbing lowers it, and the comments were rewritten.
- The extra music call was first described as every fifth frame. The code at `$2AA6` adds `$33` to `$C0` and calls again on a carry, which comes on every sixth frame; the music test against the game's own routine agrees.
- A sample of 60 comments (seed 2611) was checked by an Opus 5.5 agent: 39 right, 18 with a wrong detail, 3 wrong. Several wrong ones came from describing a routine by its name and first instructions without reading its callers (colour RAM against the colour buffer at `$0300`, the walker and bounce routines).
