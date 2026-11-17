# Jumpman Junior — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 17 November 2026, the Silver run (claude-opus-5-5)

- Orient: the G64 boots through JR, a BASIC line over the stack page, and
  JUMPMAN JR., the cartridge image with a protection stage in its first
  268 bytes of code. The game reads its own keyboard matrix, so
  `vice_keyboard_type` did nothing; keys went in through `vice.key`.
  `check-emulator` passed 55 of 57 on VICE 4.0.0; the snapshot module
  moved, and `kit/c64/snapshot.py` from another branch reads it by
  module.
- Coverage: built up over annotation files `work/ann/a06`-`a17`, applied
  with `kit/c64/r2000.py --apply`. Mistakes caught on the way: the shape
  format first read as one colour a record (it is one a pixel); two label
  clashes (`run_count`, `stick_dx`); `check_listing.py` found code typed
  as data at `$88E1` and `$97A7`. The note table at `$1200` is built at
  start-up and is zeros in the listing, so the Music tab's driver runs
  `$808A` first.
- Verify: level 10's `STA $8004` was suspected from the code and then
  shown live (a throwaway VICE script poked Jumpman onto a bomb after
  patching the level counter); a reset with the signature intact also
  failed, with BASIC's ROM over the game. The first attempt poked too
  early, before the bombs were drawn.
- Sample: seed 1117, 80 comments, a fresh claude-opus-5-5 checker: 15
  wrong in a detail, all corrected, with the shared change scripts of
  levels 7 and 11 and the rest of `$0881-$0885`.
- Pages: the story-first layout (Overview, Gameplay, Controls, Maps,
  Graphics, Music, Discoveries). The map drawing is held to the game's
  `$8A36` by `test_maps.js` (227 drawings), the sound player to `$88F2`
  by `test_music.js` (29 sounds). Writing the Discoveries tab turned up
  two more findings in code already annotated: the tape buffer pointer
  check in `next_turn`, confirmed against the KERNAL copy's `$FCE7` and
  `$FD5F`, and the extra-life score that never wraps. `$D208` reading
  back at `$D008` was tested live.
- The high-score stall at `$A914` seen once after random input was not
  reproduced and stays an open question in `features.md`.
- Reader review (claude-opus-5-5, `work/reports/reader-review.md`): the
  level 9 map let all 16 bombs be defused; shapes `$9A`/`$9B` were called
  unused (they are the dead Jumpman's flicker); the priority count
  differed between Music and Discoveries; SPELLBOUND was one sentence;
  three Discoveries sections ended with how they were tested. All fixed;
  sprite animation on Graphics left for a later pass.
