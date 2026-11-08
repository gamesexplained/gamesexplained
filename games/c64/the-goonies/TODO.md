# The Goonies — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Gold: Euan's pass over every tab on 8 November 2026 (copy
`human-edited`, steward unorig). Next is Platinum, which needs a Play tab.

## For Platinum

- A Play tab: every routine ported to JavaScript and run in lockstep with
  the game's own code (`kit/skills/core/70-minisite/play.md`), with a
  scene picker (`$12BC`) and an infinite-lives cheat (`$0BDA`-`$0BDC`).

## Open questions

- Scene 8: whether the wiki's fixed roles for the two Goonies come from
  the second Goonie's taller shapes (49-56, `$9D63`) against the scene's
  rectangles (`features.md`).
- Which tune, if any, is the film's song ("The Goonies 'R' Good
  Enough"): listen to the four on the Music tab.
- The start-up check at `$0800`: what comparing `$CF79` with `$CF99`
  was meant to catch.
- Where sounds 0, 8 and 19 are started: no `jsr start_sound` with those
  numbers was found; look for a sound number taken from a table or a
  variable.
- Why the L key turns a joystick a quarter turn.

## Ideas

- The U.S. Gold disk (`work/goonies-usgold.g64`) is a different build:
  2,144 of the 2,247 bytes at `$C029`-`$C8EF` differ, where this build
  keeps its tunes; the image's name calls its music new. Comparing the two builds' scene
  code would show what else changed.
- A frame rebuilt from memory: the scene pictures come from disk and are
  not in the listing, so it would need the packed pictures as data.
