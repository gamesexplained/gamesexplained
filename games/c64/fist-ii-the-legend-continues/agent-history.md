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

## 11 November 2026: the disk's ledger

Aaron Bell asked for the disk to be covered by the media ledger while
the pages stay with their steward, unorig. An agent run for him made
`media.json` and changed no page.

- The image is the Mindscape G64 with its protection, the first of the
  two in `orientation.md` (SHA-256 `87ad649d...`), fetched again from the
  C64 Preservation Project's collection. 22 items: the 20 files and 3
  sectors of track 2 that no file holds.
- The scan found `L`, `BNK12A`, `BNK2B`, `BNK3` and `BNK4B` in the
  listing. `LOADALL` and `BNK4A` were answered by hand: every byte of
  `BNK4A` that the listing holds is equal and the rest is a play screen
  the listing leaves out, and `LOADALL` differs only where the menu, the
  loader's own loops and `BNK4A` change it.
- The menu's code was read in the second image, the one without the
  protection, where `LL` is plain. It loads `M`, unpacks and shows it,
  loads and unpacks `T`, asks 1 or 2, shows `T`'s picture and loads
  `LOADIT` or `LOADALL`. For the Adventure it writes `JMP $C06E` at
  `$C011` first. `orientation.md` said that `LOADALL` loads `TITLE` and
  `TSETUP`; it holds the code, and the menu's jump skips it. The
  paragraph now says so.
- `M` and `T` were unpacked with the rule read from `$9B0E` and drawn:
  each is exactly 10,001 bytes and a picture, the Mindscape logo and the
  title picture.
- `L`, `LL`, `LOADALL` and `LOADIT` are the only files with a call to
  the KERNAL's `SETNAM` or `LOAD`. None asks for `TSETUP` on a path the
  menu leaves in, and none names `DUMMY`, so both are answered `unused`.
- Left open at first: the seven Training files and sectors 10 and 11
  of track 2. The Training program was listed as the part `training`
  the same day, and the disk was scanned again against both parts. The
  scan found `TNK12A`, `TNK2B` and `TNK3` whole. `TNK4A` and `TNK4B`
  were answered by hand: every byte the Training listing holds is equal
  (963 and 8,432), and the rest are buffers and the picture band the
  program writes as it runs. `TOLOR` is the colour RAM (`LOADIT` copies
  it from `$6000` to `$D800`, the same code as `LOADALL`'s) and
  `LOADIT` the loader, which the Training listing leaves out because
  sprites are built over it. `TSETUP` stays unused: neither loader
  reaches the load of it. One item is open, the two sectors.
- The table of files in `orientation.md` listed a file `TITLE` beside
  `TSETUP`. The disk has none, which made its twenty files twenty-one;
  the row now says what `TSETUP` is, and the row for `M` and `T` what
  the two pictures are.

## 11 November 2026, the Training program as a second part

- The Adventure's folder was adopted as the part `adventure` and Training
  given a folder of its own (`kit/scripts/parts.py`). The route: the
  disk's menu, `1`, and the loader stopping at `JMP $C3FD`. Training was
  never loaded in the Silver run.
- `carry.py find` placed five stretches of the Adventure's code in
  Training (the music driver, the start-up, the fighter engine, the hit
  test with the raster handlers and the multiplexer), and `pair` brought
  their names and comments over: 1,765 instructions. The comments came
  across with the Adventure's own addresses wherever they named something
  outside the code paired, such as the music driver's tune tables, and
  were corrected by hand; `carry.py` now flags those.
- Four pointer tables were first typed `lo_hi_address`, which made
  automatic symbols at addresses nothing uses; they are interleaved
  pairs, retyped `address`.
- The orientation said the loader copies TNK4B to `$D000`-`$FFF8`, from
  the file's length. Both loaders' copy loops move `$2FF0` bytes, so the
  copy ends at `$FFEF`. The simulator showed the picture held at the
  hand-over to be location 1's.
- The extra sprites at `$D480`-`$DC3F` are read only by the video chip,
  so `$D000`-`$DFFF` was included; 17 colour RAM writes made automatic
  symbols inside those images, each commented to reach 100 %.
- The sample (80 comments, seed 20261111) found 8 wrong. The worst was a
  comment calling the RTI at the end of `irq_bottom` unreachable; it had
  come from the Adventure, where the RTI after a jump really is, and a
  second comment like it at `$32C3` was found by searching for the same
  words. That led to `carry.py`'s second flag: code the copy runs into
  where the source does not.
- The manual says a two-player game is eight rounds; the code plays four.
  Findings like that went to `TODO.md` for unorig, since every page is
  theirs.
