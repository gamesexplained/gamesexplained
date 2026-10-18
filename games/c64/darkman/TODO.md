# Darkman — TODO

Tier: Bronze. Coverage 25.1 % (5,400 of 21,511 traced bytes, in 2 of 7
parts; level 1 27.6 %). Missing for Silver: 100 % coverage of every part, `facts.md`
verified, the listing sampled (`60-verify`), and the minisite.

- Analyse level 2 from `parts/level2/work/` (its snapshots are saved).
- Snapshot levels 3 to 6 the same way (PC to $0407 with the level number
  in $0435); levels 4 to 6 need side 2 attached at the disk prompt.
- Name Darkman's move states ($2768, $2F67) and which strike is a punch
  and which a kick; find the key that gives the pause code $50.
- Trace the photo-session code around the text at $57C6.
- Trace the sound driver from $B0C8 and find its play routine.
- Read the four play interrupts in full, and the title screen's chain.

Article ideas: the photo session as a mini-game; the disk prompts and the
level-by-level load; the four-band play screen.
