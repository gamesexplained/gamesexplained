# The Living Daylights — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Run of 17 November 2026 (claude-opus-5-5, kit 0.0.353)

- **Orient.** Both G64 images boot in VICE 4.0 with true drive emulation.
  The PAL disk's directory block counts are wrong (1 to 10 blocks); the
  real lengths came from following the sector chains. `TLD1` is stored
  encrypted and decrypted in place by the loader `GM1`, with a key from a
  routine in `TLD8`, so its bytes are found nowhere in memory. The
  hand-over snapshot `entry.vsf` (PC `$1100`) came first.
- **The snapshot switch.** The listing was first built from `entry.vsf`,
  then rebuilt from `play-gibraltar.vsf`: `init_machine` copies
  `$4000-$41FF` to `$0200` and `$8D00-$9CFF` to `$D000`, so the packed
  screens are only where the code reads them after it has run.
  `symbols_export.py` needed `--force` to accept the 55 tracked bytes the
  switch dropped.
- **Coverage, 69 % to 100 %.** The disassembler died once (connection
  refused); restarting it through `tools.py` and replaying
  `annotations.jsonl` recovered everything. Duplicate label names
  (`enemy_colour`, `enemy_reward`, `obstacle_count`, `level_done`) were
  rejected and renamed. Comments that ran past a span's reach or a
  memory-map edge needed continuation comments with exact ranges,
  especially the packed streams, one of which (The Pipeline's) crosses
  `$D000`. A comment at `$ACCF` that called screen 0's stream junk was
  wrong and removed. Several zero-page guesses were corrected by reading
  the code before the sample.
- **Reference pictures.** The first `level-4.png` was the weapon menu,
  not The Mansion; it became `weapon-menu.png`. `level-intro.png` turned
  out to be another Concert Hall frame, not the intro screen, and was
  removed.
- **Maps.** Running `unpack_screen` on the kit's 6502 over the
  snapshot's RAM gave the eight maps. The first render garbled some
  characters: the game unpacks screen 8 before the first level, and so
  must the page. The Fairground is a single 40 by 25 screen at `$8000`
  with colours at `$8398`, not a 160-column map. Screen 0 matched the
  snapshot byte for byte.
- **Sample.** Seed 2617, 60 of 790 comments, one checker on
  claude-opus-5-5. It found 16 wrong, all held when read against the
  code. The biggest pattern was Bond's sprites: I had called sprites
  4, 5 and 6 head, body and legs from their order, but `bond_init`'s
  positions put sprite 6 above the other two, which sit side by side.
  The helicopter's score digit (`Y = 2` is thousands) and x values held
  in two-pixel units were the next. All 16 and 14 more comments saying
  the same were corrected.
- **While building the pages.** `roll_shapes` is read from index 0 to 8
  (the step starts at `$FF`), so the roll has nine frames and its ninth
  byte is `$3424`, which had no comment; added. The jump's tables are
  read from 0 to 5 the same way. Obstacle columns show nothing in the
  map; what the player sees there is open.
- **Review.** One reader agent on claude-opus-5-5 read every tab at
  1100 and 390 px (`work/reports/reader-review.md`): 19 weaknesses, 4
  leads missing. Fixed: the Q branch claim that one gadget is always
  right (on The Mansion and Afghanistan any weapon works), the weapon
  table's line for the infra sight and hard hat, the helicopter's hit
  count, the guess about the Pipeline's "pig", the assassin's chance
  (now with its columns), the loop slider's end, levels counted from 0
  on Discoveries, the RESTORE link (`$3B56`), the Overview's link to the
  copy studied, the MI6-HQ source line, and a new Discoveries section on
  the two guide claims the code contradicts; "GIBRALTER" is on the
  Overview. Left: animating every figure and the companion together, a
  worked Huffman example, pictures in the Q and weapon tables, and the
  Contents button overlapping text at 1100 px (the site's, not this
  page's); Q branch's screenshot shows the digit 5 while the code counts
  4 to 1, which is open. These are in `TODO.md`.
