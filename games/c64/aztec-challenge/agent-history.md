# Aztec Challenge — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 8 November 2026, claude-opus-5-5, Silver

- The tape is the KERNAL's slow format. The first boot took over ten
  minutes in warp before the game ran; the hand-over boot (stop on `$1000`)
  took 577 seconds. Decoding the TAP offline with a short script
  (`work/tapdec.py`) gave the two files in seconds and showed the boot's
  `PEEK(4096)=162` trick.
- The code map was started a moment after the hand-over (`codemap.py zap`
  needs the machine running), so the start-up's first instructions are
  missing from it; the walk from `$1000` covered them.
- Every level was reached by setting `$03` on the scorecard, found in the
  level dispatch at `$12A2` within the first half hour; no play-through
  was needed.
- Two undocumented no-ops at `$7887` ran in play. Adding them to the kit's
  decoder changed one cross-reference of The Goonies' listing, which was
  rebuilt.
- Wrong turns: a poke of the Gauntlet's stage at `$6000` did nothing,
  because the level's start clears it a few instructions later; and the
  Piranha's lives counted by reading `$02` were muddled by the reset at
  the fifth loss, so the counts were taken with checkpoints on the eaten
  and life-lost routines instead. A walk of Hopaztec's floor with the hop
  rules ran off the floor, so the page shows the trapped-tile lists
  without a floor map.
- The sample checker (claude-fable-5-1) found 11 of 60 comments wrong in a
  detail; four more comments that shared two of the beliefs were
  corrected with them.
- Node was not on the path in the WSL shell; the kit's own copy is at
  `tools/node/bin`. Pages were checked in headless Chrome on Windows
  through a wrapper page that offsets an iframe (`work/shoot.ps1`), since
  the browser extension was not connected.
- The contributor asked mid-run for the graphics and sprites to be
  explained: the Graphics tab animates every sprite at speeds measured in
  VICE and draws both character sets and the pictures built from them.
- The follow-ups the contributor asked for (9 November 2026): Hopaztec's
  floor, walked in VICE, then worked out from the tables and held against
  the game's own hop checks (`test_hop.js`). The walk's first try started
  from a snapshot saved mid-level, after random hops, and wandered off the
  floor; the second showed the four exits. A backtracking hop that fired
  twice ended both walks early, which the tables made up for. Walking it
  also showed that `$5C00`-`$5C07`, the last row's Y, had been left out of
  the listing: untyped, so the coverage figure never missed it. The
  Temple's head was tested live, and the sound effects play from the
  game's own code (`test_sounds.js`).
