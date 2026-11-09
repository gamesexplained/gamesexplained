# Gradius — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 9 November 2026

- Booted the V-Max! version 2 disk in VICE (PAL, the default). The file
  `G2` unpacks twice to $0801-$FFF9 and starts at $1688; every stage is in
  memory from then on, so one snapshot (`work/entry.vsf`) covers the whole
  game and no parts were needed.
- Annotated to 100 % coverage in 35 annotation files (`work/ann/`).
  The music driver looked live at first: the play frame calls $6AA6, and
  `music_key` toggles `music_on`. Reading again showed $6AA6 is a lone RTS
  and that nothing calls `music_tick`, so the earlier claim that the music
  could be switched on was overstated and was corrected in `facts.md` and
  `features.md`.
- Screenshots on PAL were garbled: the playfield showed in extended colour
  mode. The NMI timers have the NTSC frame length ($42C6), so on PAL the
  splits wander. Switched VICE to NTSC (`MachineVideoStandard` 2), booted
  again and saved `work/entry-ntsc.vsf`; all reference shots come from it.
  The PAL loading-screen snapshot then refused to load (a known VICE
  quirk), so the loading screen was taken from a fresh NTSC boot.
- Checker sample seed 1109 on Claude Opus, an agent that wrote none of the
  comments: 14 of 60 wrong in a detail, all fixed with every comment that
  shared the belief (`ann/35.txt`).
- Wrong turn: `map_starts` gives stage 6 the address of stage 2's map, and
  the listing said stage 6 reused it. Building the Levels page from the
  event lists showed stage 6 never runs the event that turns the scenery
  on (event 1 or 16); the screenshots agree. Corrected everywhere, with the
  column counts in the map comments, which had come from decoding the
  maps to an assumed end rather than from the events (`ann/36.txt`).
- Pages: Overview (music and effects players on the game's own driver,
  NTSC/PAL split stepper, scenery viewer), Levels (each stage's scenery
  drawn whole), Graphics (every sprite shape, the last boss drawn dot by
  dot) and Discoveries. Tests beside the pages: `test_map.js`,
  `test_music.js` and `test_brain.js`.
