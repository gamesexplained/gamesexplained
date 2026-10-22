# Darkman — TODO

Tier: Bronze. Coverage 67.1 % (39,885 of 59,404 traced bytes, in 3 of 7
parts; level 1 27.6 %, level 2 91.0 %). Missing for Silver: 100 % coverage of every part, `facts.md`
verified, the listing sampled (`60-verify`), and the minisite.

- Level 2 (91.0 %): describe the screen matrices and shape blocks at
  $C000-$CFFF and $F000-$FFFF, the colour buffer and timer shapes in
  $7000-$7FFF, and the 17 untracked loaded stretches listing.py names
  (from $12B0). Its zero-page names ($00AF and others) belong to the
  resident part and are kept only in level 2's session.
- Level 2 must be reached from level 1 in play: skipped from the title
  screen, it hangs in the random routine's branch at $65BE.
- Snapshot levels 3 to 6 the same way (PC to $0407 with the level number
  in $0435); levels 4 to 6 need side 2 attached at the disk prompt.
- Name Darkman's move states ($2768, $2F67) and which strike is a punch
  and which a kick; find the key that gives the pause code $50.
- Trace the photo-session code around the text at $57C6.
- Trace the sound driver from $B0C8 and find its play routine.
- Read the four play interrupts in full, and the title screen's chain.

Article ideas: the photo session as a mini-game; the disk prompts and the
level-by-level load; the four-band play screen.
