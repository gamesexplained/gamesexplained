# The Last Ninja — agent history

## 22 November 2026

The previous VICE process had exited after a macOS OpenGL
`CGSGetSurfaceBinding` exception. Starting the installed release through
the kit restored its MCP service. Side 1 booted through Cyberload with
no input. I restored warp after the initial automatic warp ended.
Regenerator2000 opened the first gameplay snapshot, and a snapshot
reload returned the player to the exact coordinates before the joystick
test.

Setting `$02AF` to 1 took the normal transition without completing
the previous chapter. A premature checkpoint at `$BC60` was not a
reliable end-of-load marker. The captures use the visible opening
rooms, chapter letter and gameplay loop. I saved at the Dungeons
load, stopped VICE through the launcher outside the shell sandbox,
then started it and restored the snapshot. The fresh remote monitor
attached Side 2 successfully.

After restoring Wastelands and seeking to its recorded Side 1 tape
position, the reader reached end of tape without loading Wilderness.
Reattaching the tape at byte 630,000 while the reader was still
waiting brought the Wilderness title and playable room back.

## 23 November 2026

Captured all six memory handovers before the first room starts. Compared
the 40 named B–F tape payloads with the buffers returned by the live
reader. Decoded the unnamed A pages separately. The media ledger now
identifies all 54 items, and the Source tab has one resident listing and
six overlays.

Ran the original room renderer on 135 populated slots, probed its
room-edge dispatcher at 115,020 points, and compared all 162 collision
groups with an independent decoder. Matched the outputs of 171 packed
sprite decodes and used VICE to capture seven walking poses. Matched each
of the 12 staged and gameplay tracks against 6,000 native driver steps
and verified the F1 mute edge in VICE.

The precise handover isolates boot assets from the runtime bitmap and
sprite storage that reuse their addresses. The initial screen colours and
bitmap at `$C000`, `$C400` and `$E000` match the tape pages byte for byte.

## 24 November 2026

Followed the per-tick player and opponent action paths and traced the
ordinary chapter loop in each overlay. The five common music drivers
are byte-identical. The Dungeons driver uses its own pattern and
instrument format.

Pressed the speed keys and F7 in VICE. Compared inventory icon copies
with their packed source in both panel positions and tested pickup
limits and the chapter-exit life count by calling the original code
with controlled inputs on the kit’s 6502.

Decoded the room item and initial opponent records in all six chapter
overlays. Compared 162 native room setups and 3,392 native action
selections with independent readers. Followed the ending in the Inner
Sanctum from the item 9 pickup through the last player pose script.
Staged the last room in VICE from its real room setup, then picked up
the scrolls with a joystick gesture. Captured the ending text after
the second wait and confirmed the bitmap dissolve repeated.

Extended the SID comparison from 6,000 to 90,000 steps per track
after finding additional phrases beyond the initial capture window.
Used the complete payload for each expected digest. Re-identified
the three bitmap captions and the separate safe-rectangle data under
I/O. The original rectangle code agreed with 2,340 independent tests.
Inspected the two duplicated picture records and the original
renderer, including the palette bits, separately from the maps.


Checked the six shape catalogue counts against their table ends.
Resolved two additional raw Wastelands sprites through the original
selector and updated the sprite image. Compared 3,840 fire input states
against predictions for the chosen script and pickup branch.

Tested all 21 phases of the Palace Gardens sprite rotation and
compared the six copies of the hit-reaction pointer table.
Two fresh checkers reviewed all 100 comments drawn with seed
1124. The draw is saved under `work/reports/sample-1124/`.

Named the SID workspace fields in both drivers and the indexed RAM
fields that the room and item routines read. Checked two stored
Dungeons patterns through the original event reader. Called the
temporary pitch-sweep routines directly and observed the countdown
restore from the instrument step field.

## 24 November 2026

Explained 119 more tracked bytes. Compared the exact handover snapshots
with the previous chapters and checked the catalogue's stored count
against its last slot. The late Dungeons voices leave pairs of zeros
between the reads of adjacent patterns or pointer lists. The resident
notes name the collision endpoints, mask bounds and the timing channels
used by the fade and the Wilderness room logic. Three low-RAM bytes
match address operands in the KERNAL-loaded bootstrap decoded from
Side 1 and are zero in the play capture. All seven handover
snapshot hashes matched those recorded in the previous listings.

The follow-up exported the changed symbol maps from offline
Regenerator2000 projects seeded with those snapshots and the committed
symbols. Seed future disassembler sessions from these exports so an
older live session cannot overwrite the new comments.

## 24 November 2026 — stored music tails

Classified 18 bytes in Palace, Palace Gardens and Inner Sanctum as stored
rest records, a command with its argument, and two $FF/$FF pitch/duration
pairs. Controlled entries into the original event reader checked all eight
pitch/duration pairs. Three command-handler cases checked addition and
eight-bit wraparound. These checks establish the interpretation when entered,
not that ordinary playback reaches the tails. All nine new comments were
reviewed against the original code and bytes.

Exported offline Regenerator2000 projects seeded from the recorded symbol
maps and exact listing snapshots. Rebuilt the three affected listings from
those snapshots. Coverage rose from 219,646 to 219,664 of 219,680 tracked
bytes, leaving 16 unexplained. Preserved the earlier uncommitted 119-byte
annotation pass.

PR #1024 was confirmed merged. Fetching main failed because the shell could
not resolve github.com. The checkout remains detached from the merged PR's
head; no new commit or push was made on its finished branch. Apply the
follow-up to a new branch from main when Git network access is available.
The proven-model maintainer review and ordinary room route remain open.

Validation: check_binaries.py and check_listing.py passed. build.py built
139 games. test_kit.py --changed HEAD reported 51 passed, one skipped
(SkoolKit absent), zero failed. The default documentation check reported
six kit retrospective issues because origin/main predates the run. With
GITHUB_BASE_REF=last-ninja-pass-baseline (verified equal to the merged PR
head b90fd886), check_docs.py passed. That scoped comparison checks this
follow-up; it does not replace the required check against fetched main
before committing. The three rebuilt listings retain the exact snapshot
hashes and all 30,904 listed bytes per chapter.

## 25 November 2026 — align the minisite with the contributor’s pages

Compared Fist II and Skate or Die. Added an illustrated Overview, put the
existing technical material on Gameplay and the complete player on Music,
and applied the same page tokens to Maps, Graphics and Discoveries. Kept
the room viewer and sprite controls, added section labels and stable IDs,
and redirected the two old index anchors. Sources for the new overview are
named in features.md and linked beside the claims. Music verification reads
the moved player; the browser runner follows its new tab.

The host refused a local HTTP listener. The browser also refused file URLs,
so local visual preview and screenshots could not be captured. No browser
policy was bypassed.


## 25 November 2026 — add the five requested demonstrations

Added combat, jumping, items and puzzles, connected maps and an enemy
decision viewer. Extracted the small tables and pictures used by these
widgets from the exact snapshots named by their listings. The published
pages contain data excerpts and JavaScript ports, with no machine image.
Native renderer output supplies 304 pose frames and 16 inventory icons.

The portable test reconstructs memory from committed listings, executes
the relevant original routines and compares their results with the page's
JavaScript. It covers input, movement, animation, contact, enemy choices,
pickup, puzzle gates, landing bounds, room exits and every atlas pixel.
The browser runner exercises each widget and mobile overflow, but cannot
run on this host because Playwright is absent and local listeners are
refused. The pages state that they isolate mechanics: terrain collision,
projectile flight and the complete enemy movement remain outside the demos.
Coverage and tier are unchanged.
