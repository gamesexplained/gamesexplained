# Parachute — TODO

Current tier: Platinum (see game.json). Coverage is 100 %.

## For Gold

A person curates the pages section by section (AGENTS.md, "Definition of
done"): rewriting what reads flat, cutting what is dull, and adding what
the run missed.

## The listing

- The sample of 60 comments (seed 20261119) found 15 wrong in a detail,
  25 %, all corrected, with the same mistakes elsewhere. That is well
  over the mark of 2 in 60, so the rest of the listing very likely holds
  more of the same kinds: an audit of every comment by fresh checkers,
  then a new sample, is recommended (kit/skills/core/60-verify). The
  kinds found: a helper named for one of its callers, a "when" true on
  one path only, a bit's meaning taken from its first use, and a count
  off by one.

## Ideas

- Photographs of the unit: Wikimedia Commons has Parachute - Game&Watch -
  Nintendo.jpg (Xabi Vazquez, 2008, CC BY 2.0) and Game and watch
  parachute.JPG (Orlando105, 2012, CC BY-SA 3.0), not added because
  downloading them was not asked for.
- The demo's catches never reach points, so game_flags bit 0 can stay set
  in the clock and hold the tree's release back (release_check); whether
  the clock's tree ever lets a paratrooper go deserves a look on the
  model.
