# Fist II: The Legend Continues — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 30 September 2026, Silver run

- Adventure's loader reads six files through the KERNAL; with true drive
  emulation this takes minutes, and warp mode took it to seconds. Both
  loaders end in `JMP $C3FD`, found by reading them from the disk image,
  and a checkpoint there from the menu snapshot gave the hand-over.
- The first trace reached 12 KB of 61 KB. Following the Doctor Who run's
  lesson, `listing.py` was run with both snapshots before the work was
  split, and the whole load was put in `coverage.extra` at once, so the
  sprite frames, scenery and music went to the agents from the start.
- A frame capture gave the IRQ chain's handlers (the vector writes in
  one frame); tracing from them found the music driver, which the census
  had not seen.
- Eight agents took the image to 100 % in about fifteen minutes. Their
  guesses were corrected by one another: the "alphabet" at `$C6FF` is the
  sample period table, the one at `$1B9B` is sprite pointer lists, and
  `$8000`-`$BFFF` is sprite frames and animation, not the world map.
- A claim that every opponent combination store is indexed was checked
  byte by byte and found to have a second exception at `$3179`.
