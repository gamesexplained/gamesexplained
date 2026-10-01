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

## 30 September to 1 October 2026, towards a solution

- The contributor's GameFAQs and YouTube links were refused by the
  network; a search summary said to jump across the hole. The forward
  somersault (stick up and back), taken four columns before the hole in
  room 103, crossed it, which opened the route to scroll 1.
- The search was wrong in four ways, each found by driving it live. Holes
  modelled as walls deadlocked the world. Walls were single columns until
  the reach tables `$0ABD`/`$0AC7` were read. A scroll counted as reached
  when the hero was in its room's section, but he has to touch it. Types
  16 and 17 were not modelled at all.
- `$92` was taken for the hero's screen column; a fall trace showed it
  rising from 38 to 88, his height, which explained why a somersault
  passes over a drop.
- Scroll 4 looked unreachable until the trace showed that arriving in
  room 84 from room 4 carries the hero on to room 87; the search then
  routed through room 112.
- Fights stopped the driver: an encounter chain of ten opponents does not
  end when the opponent's energy is poked to 0, so route testing marks
  every non-scroll encounter as done.
- The run ended stuck at the chute from room 77 into room 79, with five
  scrolls delivered.
- The search, the driver and a handoff for the next session went into
  `solver/` (committed; the site does not publish it). Reading the users
  of `$0491` for that handoff showed that room 79's drop only blinks the
  scroll-6 icon, which ruled out a fight as the thing that stops the fall.

- 1 October 2026 (later session, unorig with Claude): the Maps and solution
  tab. The way into the scroll 5/7 region was found by reading room 43's
  exits and the scroll-6 narrowing at `$067B` together, prompted by the
  contributor's scan of a hand-drawn map whose key says scroll 6 crosses
  the crevice. The search now completes; the new legs are not driven.
