## next · 2026-10-27 · Zork I (Apple II) · air with Claude

- **Check the story's decoder against an interpreter that ran it.**
  Zork I is a version 2 story under an Apple II interpreter, and the
  game's decisions are in the story, which a 6502 trace never decodes. The
  kit now builds Bocfel 2.6 with a trace of every Z-machine instruction,
  and `kit/zmachine/ztrace.py check` decodes each one again from the story
  file: on a walk of 14 commands from West of House to the cellar, 8,995
  instructions at 950 addresses, it found none where the two disagree.
  Test stories assembled by the kit for versions 1-5, 7 and 8 hold the
  decoder to Bocfel in every version. `kit/skills/cpu/zmachine` says how
  to take a story out, run it and check it, for any machine's Infocom
  game.
- **A word an interpreter does not know may be the interpreter's.** In
  versions 1 and 2 a dictionary word puts two characters of the same
  other alphabet under a shift lock (Standard 3.7.1). Zork I holds `pdp10`
  that way (`55 35 95 28`): Bocfel 2.6 finds it, and Frotz 2.55, which
  shifts once for each character, answered "I don't know the word". The
  skill says to check a word's encoding with `story.py word` before
  writing that a game lacks it.
