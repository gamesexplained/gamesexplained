# Delta — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 1 October 2026, one session

- **Boot.** The image is a Reflex crack. Getting to the game meant
  passing the crack's depacker, its intro (SPACE), and two unpacking
  layers relocated to `$0334` and `$0100`; the entry `$1770` came from
  reading the last layer's final `JMP`. The hand-over at `$1770` was
  chosen for the listing because play swaps graphics blocks between
  `$4C00` and `$F0E0`.
- **Web.** Every page fetch was refused by the session's network policy
  (403 from the proxy). Features were built from web-search summaries and
  the game's own screens.
- **Annotation** ran in one long stretch by region. One retyping batch
  marked `$2C4F`-`$3020` as unused and wiped real code; it was
  re-disassembled and relabelled (the bullet movers, `orbiter_draw`).
- **Names corrected late**: `$1240` was taken for frame lists and is the
  hit points; `$11AE` was taken for the shop and is the panel ship's spin;
  icon 6 was taken for a freeze and is the slow-down; the routines first
  called scenery hits are the weapons' hits, found by reading the screen.
  That last one came out of verifying: no `$D01F` read anywhere, so the
  question became how the game knows a shot hit.
- **Tune numbers.** `facts.md` first named the tunes from the values the
  callers store in `$117D` ($0C game over, $0D completion, 1 next
  player). The page's music player, built on the driver's own numbers,
  disagreed; `sfx_queue_service` does `DEY` before `set_tune`, so the
  request is the tune plus one. Facts were corrected (game over 11,
  completion 12, in play 0).
- **Extra life.** A draft of the page said every 100,000 points on the
  panel; the digit comments (`$11C1` is the panel's hundred-thousands)
  put it at every 10,000.
- **Minisite.** The music driver runs in the page as a 6502 interpreter
  over `$BC00`-`$CFFF`, checked register by register against the
  simulator. Stars, shot masks and the shop were ported and tested; the
  stage decoder was tested against the 32 banners. A flight-path viewer
  for the waves was started, but the trace recorded from `wave1_start`
  held no live enemies for 260 frames, and the viewer was left for later
  (`TODO.md`). The page's `.strip` class collided with the site
  stylesheet's and was renamed. The banner font drawing matched the
  screenshot pixel for pixel once the multicolour pairs were mapped
  (01 white, 10 grey, 11 dark grey).

## 2 October 2026, the page split

- At the contributor's request, the single page became five tabs after
  the Ghostbusters layout: Overview, The 32 stages, How it works, Music
  and sound, Discoveries, with the shared styles and widget code in
  `reference/delta-page.css` and `reference/delta-page.js`. New sections:
  the game, its makers and the copy studied (makers from web search
  summaries; page fetches were still refused), every stage in a table,
  the scenery rows, enemy fire, the sound effects, open questions.
- A section id equal to a widget's id (`music`) let the music player
  replace its whole section; the section was renamed.
