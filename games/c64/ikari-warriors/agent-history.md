# Ikari Warriors — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 17 November 2026: from the disk to Silver, in one session

- **Orient.** VICE v4.0.0 failed two of `check-emulator`'s tests at
  first. Both came from one cause: v4.0.0 snapshots put a 23-byte
  `C64MEMHACKS` module ahead of `C64MEM`, so `kit/c64/snapshot.py` read
  the RAM 23 bytes off. Walking the modules fixed both (57 of 57). The
  Data East disk hangs in its loader on a PAL machine and runs on NTSC;
  switching back left `VICIIModel` at 0, and every saved snapshot refused
  to load until it was set to 1 again.
- **Annotate.** The map script was the key: once `map_script_step` and
  the object streams were read, a Python copy of `draw_map_row` first
  matched only 35 of 64 drawn rows, because the ground pattern's row
  follows the window row, `(32 - r) AND 63` for route row `r`. With that
  it matched all 49 rows the game had drawn in `play-area1.vsf`. The
  map objects' and tile sets' comments were then generated from the
  script's run. Re-applying an older annotation file overrides later
  labels at the same address; the newest file has to go last.
- **Verify.** The fire hold, the extra lives, the ending and the three
  power-up slips were each run, in VICE or on the kit's simulator
  (`facts.md`). Walking to the real ending live failed: after moving the
  script pointer the player was blocked by scenery drawn for a different
  place, so the ending was shown with the script moved to its last
  commands instead. A checker that wrote none of the listing sampled 80
  comments (seed 1117): 16 wrong, all among the 60 hand-written ones,
  mostly a wrong detail (which text a routine prints, which way a search
  runs, a table's base). All 16 were read against the code, held, and
  fixed (`/tmp` annotation file `a16_fix`, applied last).
- **Media.** The scan matched nothing on the game's tracks. Matching
  sector by sector found tracks 19 to 24 plain in the loader's
  interleave and the loading picture on 15 to 17; tracks 8 to 14 matched
  only through a key, every byte EORed with `$C9`.
- **Pages.** The game's own `draw_map_row`, run once a row on
  `kit/cpu/cpu6502.js`, gave the same 1,891 rows as the Python copy, so
  the Maps page runs the game's code rather than a port; it also finds
  the 26 tile-set loads and 21 helicopters. The music player runs the
  game's driver for the three tunes and the 23 effects; `test_music.js`
  holds it against the same code on the simulator.
- **Reader review** (claude-opus-5-5, an agent that wrote none of the
  pages; report in `work/reports/reader-review.md`). Fixed: the music
  played every voice on voice one, because the coverage exclusion of the
  driver's state hid `voice_regs` (`$E5B9`), now listed, with a test that
  every voice sounds; the banner (tier set); the credits link and the
  encoded-tracks caption; the Maps slider, the marks' order and the grey
  ending ground; the shell-range slip moved under a fitting heading,
  with units and advice for a team; ten more effects named from their
  callers; the panel sprites' colours; the turrets, enemy tanks, water,
  the shoot-through grenade's fly-on kill, "every fourth soldier", the
  debug sign, and the characters' solid, bullet-stopping and water
  marks; test narration cut from the pages; the Oxford commas, the "It"
  sentences and the missing links. Left, in `TODO.md`: soldiers, mines,
  tanks and guns on the map; the eighth token and the unused tile
  shapes drawn; animated and assembled sprites; who the ending's eight
  figures are.
