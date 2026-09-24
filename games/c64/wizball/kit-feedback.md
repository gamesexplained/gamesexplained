# Wizball — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Changed in this branch

**Getting the emulator (`kit/c64/get_vice.py`, `kit/c64/tools.py`,
`kit/c64/INSTALL.md`, `kit/skills/c64/tool-vice-mcp/workarounds.md`).**
`get-vice` asked the GitHub API for the newest release and stopped at a
403 from this session's proxy, which refuses the API, web pages and
`codeload` for repositories not attached to the session. The release
asset URL itself (`github.com/<owner>/<repo>/releases/download/<tag>/<file>`)
redirects to `release-assets.githubusercontent.com` and downloads.
`get-vice` now falls back to `git ls-remote --tags` for the newest tag and
probes the asset names directly. The Linux GUI zip is built for
`/usr/local` and did not find its ROMs from `tools/vice-mcp`; the launcher
now links `tools/vice-home/data/vice` (inside the XDG data path it already
sets) to the unpacked `share/vice`. A missing runtime library made the
binary exit with a loader error; `tools.py` now runs `ldd` and names every
missing library in its message, and `INSTALL.md` lists the 14 apt packages
the zip needed on Ubuntu 24.04. At the contributor's request the happy
path was then tested end to end from a clean `tools/`: the release zip
downloads, unpacks, starts and answers. The earlier claim in
`INSTALL.md` that the last Linux run "could not reach GitHub's release
downloads" was about the API, not the downloads, and is gone.

**Skills, during the run.** `10-orient`: save the hand-over snapshot and
compare it with the play snapshot (the initialisation here runs from what
becomes screen memory, so only the hand-over holds it), and compare the
cracks on a disk that carries several. `30-text`: search for the letter
differences of a known word before trying alphabets, which finds text
under any constant offset. `50-coverage`: calls whose target is written at
run time (a display list's `JSR`, a music driver's `JMP (table)`) and how
to seed the tracer from their tables. `tool-regen2000`: placeholder
operands of `$0000` send the tracer into zero page.

**Skills, in the retrospective.** `c64-reference`: the RAM under the I/O
area belongs to the video chip in bank 3, and a section on undocumented
opcodes (the ones seen here, the unstable `LXA` constant, addresses that
wrap past `$FFFF`). `50-coverage`: look at `$D000`-`$DFFF` whenever `$DD00`
selects bank 3. `60-verify`: a row for "nothing reads that byte" in the
table of negative results, and poke a variable before the code that reads
it, or use the game's own way in. `70-minisite`: rebuild a raster-split
screen from the video registers and sprite pointers recorded at every
interrupt of one frame. `tool-regen2000`: undocumented opcodes appear as
`.byte` lines and the bytes after them as instructions they are not; code
that indexes into I/O mints symbols in the RAM beneath. `kit/CHANGELOG.md`
0.0.18 and `kit/VERSION`.

**The site's SID player (`site/lib/sid.js`).** It applied each frame's
final registers, so a gate turned off and on within one frame, which
Wizball's voices 2 and 3 do at nearly every note (the test bit, then the
note), never restarted the envelope: 1,836 of the 1,909 note starts on
voice 3 of one bonus-stage tune would have had no attack. A driver may now
keep `writes`, every register write of the frame in order, and the player
applies them in order before the final registers. A driver without it
(Master of Magic's) plays exactly as before; both were played in the built
site, and a node check with a driver that re-gates a voice within one frame
showed the envelope restarting with the writes (its level from 6 to 231)
and not without them (6 to 4). The contract is in the header of `sid.js`.

`verify-footprint` was clean on this machine.

## For a maintainer to decide

- **The ledger's default exclusion of `$D000`-`$DFFF`.** It hid 4 KB of
  sprite shapes until the page needed them. `listing.py` has the snapshot:
  it could warn when an excluded range holds non-zero RAM that is the same
  in the entry image and in play (loaded data, not state). The skills now
  say where to look, but a warning would catch it without anyone
  remembering.
- **A decoder for undocumented opcodes.** The disassembler shows them as
  data, so every search for readers of an address is incomplete in a game
  that uses them for protection. A small kit script that lists the `.byte`
  runs inside code blocks and decodes them with the full NMOS table would
  have settled the `$85` disagreement between agents in one pass.
- **A kit script for the rebuilt frame.** Every raster-split game needs the
  same capture (registers and sprite pointers at each interrupt of a
  frame) and the same line renderer; `work/frame/render.js` and the
  capture loop here are general enough to move into `site/lib/c64.js` and
  `kit/c64/` with a test.
- **The subagent brief.** `50-coverage` already says a brief carries only
  checked facts, labelled guesses aside. This run's brief carried one
  unlabelled guess (that a routine copied the cauldrons); the agent that
  met it said so rather than following it, which cost it time. A template
  for the brief, with a "Guesses" heading, would make the rule hard to
  break by accident.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 28 | claude-opus-5-5 | 1 | release zip tried then source build (both flaky on determinism checks); three cracks compared in RAM; Remember's intro and manual read from memory; entry and loops traced |
| 20-features | 6 | claude-opus-5-5 | 1 | C64-Wiki, c64.com manual and review, Zzap 27 OCR, Wikipedia; attract, Wiztips and play screenshots |
| 30-text | 3 | claude-opus-5-5 | 1 | charsets rendered; text is PETSCII with FF terminators and a row/column prefix; 60 strings found in one sweep once the offset was known |
| 40-sweep | 10 | claude-opus-5-5 | 1 | register census and PETSCII string sweep from a local disassembly of the traced code; display lists and pointer tables resolved to seed the tracer |
| 50-coverage | 69 | claude-opus-5-5 | 1 | nine parallel annotation agents by address range (about an hour each), then the lead's own low RAM, the music driver's zero page and the stray unreferenced bytes; merging and spot checks |
| 60-verify | 24 | claude-opus-5-5 | 1 | fourteen live tests; the level 5 stray tile took longest (a level poke too late for the map, then a random start position, then the continue keys); the lab-hang reachability argument; facts.md written from nine agents' notes |
| 70-minisite | 68 | claude-opus-5-5 | 1 | the rebuilt frame (per-interrupt registers and sprite pointers after a first render drew the beam for the ball), the landscape renderer and the ball port with their tests, and the music driver ported by one agent in parallel (an hour; exact on all nine tunes); the RAM-under-I/O sprites found and added to coverage on the way |
| 80-retro | 0 | claude-opus-5-5 | 1 | kit edits (platform reference, four skills, the SID player), changelog, kit-feedback, game.json, TODO and cheats |
| total | 210 | claude-opus-5-5 | | 3.5 h of work |

The retrospective shows almost no time because its edits were made
during `70-minisite`, while the music port ran in the background. The
table counts the lead's steps; the ten subagents' hours ran alongside them
and are not in it.

The one change to the kit that would have saved the most minutes: a
shared capture-and-render script for raster-split screens (the loop that
records the video registers and sprite pointers at every interrupt of a
frame, and `work/frame/render.js`, moved into `kit/c64/` and
`site/lib/c64.js` with a test), since the rebuilt frame took half an hour
here and every split-screen C64 game needs the same one.

## Operating system and tools

- Ubuntu 24.04 cloud container, Linux 6.18 x86_64, four cores, no display:
  VICE ran under Xvfb. Python 3.11.15, node 22.22.2.
- The session's proxy refuses GitHub's API, web pages and `codeload` for
  repositories that are not attached to the session, and allows release
  asset downloads and `git` over HTTPS.
- VICE 3.10 via vice-mcp 3.13.1. `check-emulator` failed
  `determinism-running-save` and `determinism-restart` intermittently on
  both the release zip and a build from source (53-56 of 56 over seven
  runs); snapshots were saved from a stopped machine throughout, and no
  live test depended on replaying a running snapshot exactly.
- regenerator2000 0.9.20.
