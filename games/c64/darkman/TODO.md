# Darkman — TODO

Tier: Bronze. Coverage 76.6 % (52,841 of 68,952 traced bytes, in 3 of 7
parts; level 1 27.6 %, level 2 100.0 %). Missing for Silver: 100 % coverage of every part, `facts.md`
verified, the listing sampled (`60-verify`), and the minisite.

- Level 2 (100.0 % of the traced bytes): the panel pictures, colour buffer and
  timer variables are described. The RAM under the I/O area ($D000-$DFFF,
  the play character set at $D000 and sprite shapes from $D680) is not
  described yet and is not counted. Its zero-page names ($00AF and others)
  belong to the resident part and are kept only in level 2's session. Name
  the sprite shapes no table reaches ($01, $04, $07, $13, $16, $17, $80-$8B,
  $8E, $8F, $A4-$AF and others, $C2-$C4) by tracing the sprite pointers
  ($CBF8-$CBFF, $CFF8-$CFFF) in the emulator while playing: player_draw adds
  $02 and $04 to the pose for poses 2 and 3 but $24 and $2E for pose 4, so
  the player's real pointer set is larger than the tables show.
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
