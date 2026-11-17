# Summer Games II — TODO

Tier: **silver**. Coverage is 100 % over all fourteen parts (460,173
bytes), every file on both disk sides is answered in `media.json`, the
listing's sample (seed 2617, 70 comments) was checked on a proven model,
the minisite has players for all 35 tunes and a Graphics tab drawing
every athlete's frames, and the reader review is settled.

## For Gold

- A human pass over each tab (Overview, Gameplay, Controls, Maps,
  Graphics, Music, and Discoveries), recorded in `copy`.

## Recommended

- A full audit of the listing's 3,878 comments by fresh checkers on a
  proven model, then a new sample. The sample found 7 of 70 wrong (10 %,
  interval 4.9 % to 19.2 %), all corrected, which is over the mark, so
  the Source tab says the listing has not had a full audit. Six of the
  seven were in written comments about pictures and sprite positions;
  the audit should look hardest there.

## Open questions

- Whether the world records are written back to the disk in play. The
  code that saves them was traced, not watched.
- The menu's unused tune rows at `$3FE4`: seven rows cut off by the end
  of the file with no end marker, so playing them would mean inventing
  an ending.
- Where the opening ceremony's older copy of its tune starts, among the
  leftover bytes after `pose_wait`, so that the Music tab can play it.
- What happens in the standings after a fencing bout that both fencers
  lose.
- The first Summer Games disk (side mask 4 in the loader's table) was
  not in the contributor's set, so the six events the menu loads from it
  are unanalysed.

## Ideas

Several of these came from the reader review and were left for a later
pass, because each needs work the notes do not yet hold:

- Label Triple Jump's, High Jump's and Equestrian's frames by phase (run,
  hop, step, jump, landing) on the Graphics tab; the frame-to-phase map
  is not worked out.
- Draw Kayaking's `debug_position` as the clock would show it.
- Each country's flag on its anthem's button, drawn from the menu's data.
- How long a cyclist who stops pedalling takes to reach 200 metres, once
  the speed-to-distance rule is worked out.

- Composite pictures of the sprite sheets whose pieces the game puts
  together at run time (Rowing's boats, Cycling's riders, Kayaking's
  paddler), drawn as the game places them.
- The opening ceremony's and Fencing's sprites in the colours the game
  gives them, rather than in white.
- A Play tab for one event: High Jump's run-up and clearance are
  table-driven and small enough to port.
- Cross-links with the sibling Summer Games page once both are merged.
