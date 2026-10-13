# Darkman — TODO

Tier: Bronze. Coverage 9.8 % (2,000 of 20,342 traced bytes, in 2 of 7
parts). Missing for Silver: 100 % coverage of every part, `facts.md`
verified, the listing sampled (`60-verify`), and the minisite.

- Snapshot each later level (`level2` to `level6`) by playing, or by
  setting $0435 and calling the loader at $0407, and confirm which
  addresses each load writes.
- Save the hand-over (`entry.vsf`) with a checkpoint on `JMP $0A20` at $0424.
- Trace the photo-session code around the text at $57C6.
- Trace the sound driver from $B0C8 and find its play routine.
- Read the four play interrupts in full, and the title screen's chain.

Article ideas: the photo session as a mini-game; the disk prompts and the
level-by-level load; the four-band play screen.
