# Green Beret — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Platinum. Coverage and verify ran on a proven model; the sample check found
14 of 80 comments wrong (17.5 %), all corrected with 14 more that shared
their mistakes. An audit of the whole listing (`kit/CHECKING.md`) is
recommended before anyone relies on it line by line. The Play tab is the
whole game ported to JavaScript, routine by routine, held in lockstep with
the game's code (`port/test/lockstep.js`, every saved moment), and
`test_play.js` holds the published page beside the game's code from the
start-up and from moments through all four stages.

Next: Gold needs a human's pass over each section; with it the game is
Diamond.

## Traced, not yet shown on a page

Each is in the listing and could become a Discoveries section once it is
shown live:

- The rounds never speed up the shooting: `loop_count` is meant to count
  the rounds of the four stages, but `stage_complete` puts it back as it
  was (`DEY`, then `INY`), so it is always 0 and `fire_frame_c` never
  becomes `$FA`, as it would from the third round.
- The dogs never leap at a hero who holds the stick down
  (`dog_leap_check`).
- `para_hit` is only ever set to 1, so a hit paratrooper always holds
  enemy slot 1 still, whichever slot he is in.
- `stage_digits` is never reached.
- Sprite shapes `$52`-`$5D`, kneeling and leaping soldiers, are in no
  shape table and loaded by no instruction.
- Voice 1's pulse sweep, started again, takes its low byte from whatever
  was last left in `v1_pulse_width` (`$E190`), where voices 2 and 3 keep
  a copy.
- Holding 1 also skips `cia2_serial_check`, the copy-protection check.
- The Prison Camp's last map column reads its tiles from the I/O area.

## Ideas

- A stepper for the multiplexer: one frame's 21 virtual sprites sorted
  into the eight the chip has, band by band.
- The source's other differences: `greenberet.asm` (Martin Galway's
  source, 5 April 1986) and the game differ in several tunes' notes
  (`STRT`, `OVER`, `COL1`-`COL3`, `TITL`); a note-by-note comparison
  would show what changed before release.
