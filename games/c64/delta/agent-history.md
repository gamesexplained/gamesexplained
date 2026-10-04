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

## 4 October 2026, the attack waves tab

- The Attack waves section moved from How it works to a tab of its own,
  `waves.html`, in four sections.
- The `path_segments` comment said bit 7 of a segment's fourth byte
  mirrors the velocity list. The mover copies it to `$1219` at `$8369`
  (1 when set, X being 1 from `$8326`) and starts the form change at
  `$8449` only when `$1219` is not 0, so it is the change-form flag, as
  `facts.md` already said. The comment was corrected.

## 4 October 2026, the attack-wave player

- Chose to record the game's own wave code rather than port it: Delta runs
  from the hand-over in `kit/c64/machine.js`, starts on one press of fire,
  and plays its groups in the order VICE shows.
- With nobody playing, stage 1 never ended: its last group (`$0D`) is a
  boss with an escort that never leaves. The stand-in shots had to go in
  through a hook at `$9024`, because `enemies_flags_clear` wipes the hit
  flags each frame; had to skip exploding and final enemies, or each hit
  restarted the explosion; and had to set `$129D` as a weapon hit does,
  or the escort never exploded.
- VICE's runs from `wave1_start` restarted the wave list several times:
  the parked ship was rammed (VICE reports sprite collisions, the kit's
  machine does not). Both runs then got `$2C44` = 0 so collisions never
  hit the ship, plus the trainer's two patches. The snapshot `stage2_rows`
  turned out to hold stage 1's wave list under stage 2's banner, being
  made by forcing the stage clear, so stage 2 was played into in VICE.
- The enemy sprite pointers are at `$30` + slot (read by the multiplexer
  at `$2A99`), not at `$B8` or `$C6`, which are the scenery rows'.
- "Invisible" was checked across all 32 stages: the empty sprite `$9B`
  shows only for an enemy's first one to three frames and at the end of
  an explosion.
