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

- 1 October 2026 (same session): the contributor found the room explorer
  (a bar per room with its exits) of no use, and pointed at a hand-drawn
  map of the whole world. The tab now draws every room's scenery from the
  game's own tables, checked against the jungle and stone-wall
  screenshots, laid out by `solver/maplayout.py`. A layout from the
  exits' columns alone overlapped badly, because the rooms' columns do
  not agree with each other; placing rooms row by row and moving them
  sideways or a row on when the spot is taken gave a readable drawing.

## 1 October 2026, curate: manual, gameplay, music

- The contributor attached the manual (Lemon64's docs image) after the
  session's fetch was refused. It gave the move names for the two
  unnamed diagonals (the somersaults), the full credits and the trigram
  names. Matching the game's scroll icons to the manual's drawings named
  each scroll; the manual's list order differs from the game's.
- A player's claims on Lemon64 (respawns from a kill count, scroll 5 does
  nothing for damage) were tested against the code: the defeat counter,
  the 30-defeat respawn rule and scroll 5's single reader agree with them.
  The same counter shows the manual is wrong about meditation counting
  defeats since the last one.
- The tabs were split at the contributor's request: Gameplay (quest,
  controls, Chi, trigrams, enemies, respawns), Graphics (fighters,
  scenery, the frame), Music (a port of the driver with the site's
  player). `build.py` gained gameplay.html and graphics.html as authored
  tabs. The driver reads voice 3's envelope for a filter sweep, so
  `sid.js` now hands a driver `$D41C`/`$D41B` through `readback`.
- A text walkthrough the contributor found (author unknown) agreed with
  the shape of the route: eight scrolls, a temple each, kicks, jumps and
  the volcano last.
- How it works was then folded away at the contributor's choice: how a
  blow lands went to Gameplay, how rooms join to Maps and solution, and
  the scroll flags into the Gameplay trigram table.
