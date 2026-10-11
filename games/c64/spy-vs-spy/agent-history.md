# Spy Vs Spy — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 9 October 2026, the Silver run

**Orient.** The image is a G64 of First Star's North American disk. On a PAL
machine the load ended in a loop that bumped the border colour for ever;
reading it showed `wait_ntsc_sync` (`$8E38`), and switching VICE to NTSC
(`MachineVideoStandard` 2, set again after every emulator restart) made it
play. The loader checks for read errors on track 5 sector 0 and track 30
sector 5 and formats the disk when they are missing; it was described in
`orientation.md` and left unannotated.

**Coverage.** The work went by routine and by table, with annotation files
applied by a small script (`work/scripts/annot.py`) and exported after each
session. `coverage.py --live` first failed with `ModuleNotFoundError` for
`ports`: `symbols_export.py` loaded a module by path without its directory on
`sys.path` (fixed in the kit on this branch). Several readings were wrong at
first and were put right as the code around them was read: object 8 is the
gun with its string tied, not the time bomb; `$5D`/`$5F` are the clip edges of
a side door's frame, not climbing states (so `spy_falling` became
`spy_sinking`); the option variables are `$022D` level, `$022F` players,
`$0231` IQ and `$0233` hide; the attract demo replays recorded moves and does
not use the computer player.

**The code map.** `kit/c64/codemap.py` reads VICE's monitor memmap. Loading a
snapshot, or stopping the machine through the MCP server, ended the record:
what ran afterwards was missing, and the first map looked complete while it
was not. A session from boot, zapped after the load and never paused
(`work/scripts/drive_rt.py`, input by wall-clock sleeps) gave the map in
`codemap.json`. The memmap's ROM/RAM column follows the address, not the
banking, so RAM under the KERNAL shows as ROM execution; a parser change for
that was tried and reverted. The monitor socket wedged twice; restarting the
emulator cleared it.

**Verify.** A first sample of 60 comments (seed 20261009) had 12 wrong. A
full audit by a fresh agent rewrote 83 comments before stopping at the
contributor's usage limit; three of its changes were checked against the code
before applying the batch. A second sample (seed 20261010) had 2 wrong
(`facts.md`). Live tests are listed in `facts.md`; the trapulator's prompts
needed the game's state polled between presses (`work/scripts/trap.py`).

**Minisite.** The kit's renderer, frame test and SID player assumed PAL. NTSC
support went into `site/lib/c64.js` (263 lines of 65 cycles, the picture's
first line, the sprite fetch two cycles later, and VICE's NTSC frame starting
at line 12), `kit/c64/frame.py` (line numbers and the test bands) and
`site/lib/sid.js` (the NTSC clock and frame). The music, route search and
scoring were ported and each held against the game's routine in
`kit/c64/cpu6502.js`. The route test (`work/test_route.js`) needs every level
built, and the snapshot held one: it runs the game's own `build_embassy` in
the simulator for each level. The music test is committed (`test_music.js`,
listing bytes only); the route and scoring tests read `play.vsf` and stay in
`work/`.

**Worker restart.** Midway the session's worker restarted, which stopped
both tools; regenerator2000 came back with an empty project. Rebuilding it
with `symbols_import.py` from `symbols.json` and exporting again gave the
same symbol map, apart from `j_FCE2` coming back as `KERNAL_RESET_VECTOR`.

**Frame test after a standard switch.** With the emulator switched to NTSC
and back to PAL, `frame.py test` failed by one pixel on line 138 on a clean
checkout of `main` as well; a freshly started emulator passed.
