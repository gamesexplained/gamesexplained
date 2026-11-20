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

## 4 November 2026: the Graphics tab

A later run, retrofitting older minisites with a Graphics tab, added
`graphics.html`: the spies walking, holding the club, frozen and rising
as angels, the four traps the game draws over a spy step by step, the
sprites for what a spy carries and for the trapulator, and the plane
taking off. The frames are drawn by `svFrame` from the game's frame and
shape tables, and every card counts in the spy's turns, timed from the
game's own counts. How it works links to the tab from the spies' drawing
and the traps.

`test_graphics.js` matches every frame against `draw_spy_shape` run on
the kit's 6502. The first version differed on frames 46 and 60, which
draw past the box's right edge; the routine stops at the byte that holds
it, and `svFrame` now does too. Forcing an action on the white spy late
in a game found it already knocked out by the computer's spy, so the
test forces it 30 frames in, alone and unfrozen. The angel after the
bucket started a turn out of step with the other traps' until the
cards simulated the action's count as `spy_sinking` keeps it. The random
game drew frame 0 on its first turn, which corrected the tab's claim
that frame 0 is never drawn, and the frame headers' listing comment,
which described three bytes a strip, was corrected to the two the code
reads.

## 11 November 2026, the Overview and Controls tabs

The contributor asked for an Overview tab before How it works, and a
Controls tab. The How it works page moved from `index.html` to
`mechanics.html`, as other games with an Overview have it, and
`game.json`'s `redirects` send each of its old section links on.

The Overview's release and reception rest on Wikipedia, C64-Wiki and
scans of Commodore User on the Internet Archive. A search snippet put the
magazine's review in "issue 15, February 1985"; the archive dates issue 15
December 1984, and the scan of page 66 gave the scores (4, 4, 4 and 3 out
of 5). The same page's Screen Star award went to Zaxxon, not to Spy vs
Spy. MobyGames and Lemon64 refused automated requests (HTTP 403).

The container was new and the disk image was gone, so the controls were
checked in the kit's 6502 simulator rather than in the emulator. Reading
`read_controls` showed that it leaves keyboard row 7 selected between
calls, so row 7's keys read as the port-1 stick, and that it tests each key
by its whole row. `features.md` had said Space is not read on the options
screen; the simulator shows SPACE reads as port 1's fire, which the options
screen takes from either stick, and the row was corrected.

## 20 November 2026: the Music tab

The contributor asked for a Music tab after Graphics, with the music
section moved there from How it works. `music.html` carries the section
unchanged, with its driver port, tune data and player, and a hero that says
what the page plays. How it works lost the section and its scripts, and its
sections were renumbered, with the two "section 07" references moved to 06.
`game.json` forwards `mechanics.html#the-music` and the older
`index.html#the-music` to `music.html#the-music`, and `test_music.js` now
holds the port on `music.html`. The effects player and the 33 unreached
bytes between the tunes stay in `TODO.md`.

The contributor then asked for a Levels tab before Graphics, with the
embassy and the computer's spy moved there. `levels.html` carries both
sections with the map viewer, the level table and the route search, and its
hero names the eight embassies (6 rooms on one floor up to 36 on two, read
from `level_rooms` `$BC91` and `level_map_lo` `$BC71`). The Traps table on
How it works was filled by the embassy code, so it now reads the room
counts from the listing itself. How it works runs 01 to 07.
