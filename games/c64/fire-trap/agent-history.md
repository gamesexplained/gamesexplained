# Fire Trap — agent history

- 10 November 2026: installed VICE v3.14.0 (nine runtime libraries unpacked into `tools/vice-libs`, no root) and regenerator2000 0.9.20 (needs `--locked`). The disk is a Triad crack: intro, trainer, then a second-stage unpacker at `$0816` whose last instruction jumps to `$0900`. Trainer keys must be held about two seconds.
- The stack at the trainer's key wait led to its code at `$C984`; after RETURN it patches the cheat bytes and jumps to `$0816`.
- Joystick: the game reads both ports (`$12` is port 1, `$13` is port 2); during the first playtest the fire and direction presses in the attract loop did not start a stage the way expected, so the controls are traced from code, not observed.
