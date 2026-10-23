# Darkman — TODO

Tier: Bronze. Coverage 80.7 % (70,888 of 87,840 traced bytes, in 4 of 7
parts; level 1 27.6 %, level 2 100.0 %, level 3 95.3 % of its traced bytes,
with 9,893 bytes of loaded data not yet counted). Missing for Silver: 100 % coverage of every part, `facts.md`
verified, the listing sampled (`60-verify`), and the minisite.

- Level 2 (100.0 % of the traced bytes, nothing bare): screens, sprite shapes,
  panel pictures, colour buffer, timer variables and the RAM under the I/O
  area ($D000-$DFFF) are described. Its zero-page names ($00AF and others)
  belong to the resident part and are kept only in level 2's session. The
  sprite shapes that no code of level 2 reaches ($01, $8E, $8F, $B2, $B3,
  $BC, $BD, $70, $73, $74) are still unnamed: $8E to $BD hold the same bytes
  in levels 1 to 3 and draw no figure, and $DB (all zero) is the invisible
  shape that level 3 gives sprite 0 at $0C65. $01, $70, $73 and $74 are
  level-specific; trace them from level 1's code.
- Level 2 must be reached from level 1 in play: skipped from the title
  screen, it hangs in the random routine's branch at $65BE.
- Level 3 (rooftop and helicopter, mask game at the end): 100 routines and 169
  variables named. Next: describe its 9,893 bytes of loaded data that the ledger
  does not count (`coverage.py games/c64/darkman/parts/level3` lists them: tile
  maps, fonts, pictures, shapes at $E000-$FFEF, the tables the first pass
  listed as undecoded), type the unreached copy of the timer at $0F5B-$0FAD, and
  check the object, mask and scan texts. dm.py attaches the disk side itself
  (without it the load stops at "DISC ERROR").
- Snapshot levels 4 to 6 the same way (PC to $0407 with the level number
  in $0435); they need side 2 attached at the disk prompt.
- Name Darkman's move states ($2768, $2F67) and which strike is a punch
  and which a kick; find the key that gives the pause code $50.
- Trace the photo-session code around the text at $57C6.
- Trace the sound driver from $B0C8 and find its play routine.
- Read the four play interrupts in full, and the title screen's chain.

Article ideas: the photo session as a mini-game; the disk prompts and the
level-by-level load; the four-band play screen.
