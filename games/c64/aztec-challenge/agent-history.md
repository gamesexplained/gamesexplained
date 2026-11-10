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

## 9-10 November 2026, claude-opus-5-5, Platinum

- The contributor asked for Platinum after Silver. The port was written a
  group at a time (the engine, then each level) and held in lockstep with
  the game by a development harness before the next group began; one
  agent, no helpers.
- What the lockstep caught, in order: the KERNAL exit must read `$DC0D`
  or the interrupt repeats for ever; the menu key and the scorecard stick
  must be taken from the game where it read them; delay routines leave
  their zero-page counters at 0, which the port must too; voice 1's pitch
  is written by the music interrupt as well, so a checkpoint comes before
  each of the main program's writes; the Vermin's wait for line 0 or 256
  can be swallowed by an interrupt, so its exit is a checkpoint in the
  lockstep; Hopaztec's stick loop does nothing but poll, and counts each
  turn with the stick up or down in `$68`, so each read is a checkpoint;
  the Stairs' `LDA $D011` and `INC $D011` copy the raster's ninth bit at
  that moment, so the port takes both from the game.
- The kit's machine reads voice 3 as 0, which left every Hopaztec trap on
  tile 0 and the previews' stick still; the test gives it seeded bytes.
- The first page runtime ran 37 % fast from the cold start: the stretch
  from `$1000` to the first checkpoint was not timed, and its delays were
  charged to the next stretch as a negative cost. The lockstep's `entry`
  fixed it, as `play.md` says. A pace check by checkpoints a frame on two
  separate runs never settled, since the page and the machine draw
  different random numbers; it became the costs against the game's cycles
  on a held-out session, the start to the menu, and the page alone. The
  Gauntlet's costs needed a cost per routine call as well as per stretch.
- Two listing comments corrected: the Stairs' colour loops run once, and
  CIA 2's timer, which gives the third block's X, never runs (stopped at
  `$FFFF` in every snapshot), so that block always comes back at X 255.
