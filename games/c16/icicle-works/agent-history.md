# Icicle Works: agent history

## Setup and documentation

The contributor selected Silver, allowed web research and authorized the
finished pull request and relevant maintainer issues. The contributor
identified the chat as GPT-6.1 Sol at extra-high reasoning. GitHub login
and verified commit author are jankfoundry; the author address is the
GitHub noreply address. The branch is game/c16/icicle-works in the
jankfoundry/loderunner-ge fork. Push access was verified with a dry run.

The tools were copied into this checkout from the existing local
cuthbertinthecooler-c16 checkout. get-plus4emu rebuilt the library against
this kit: plus4emu 1.2.11, source commit 939e652, with codemap.patch,
without libsndfile. Python 3.12.3, g++ 13.3.0 and Node v20.19.5 were
already installed. No Rust install or new tool download was needed.

Port 7501 belongs to the kikstart-c16 checkout, so this run uses 7510.
The emulator footprint check on 7512 reported no unexpected writes outside
the repository. The first capability check was interrupted after the tape
replay test; its completion was not claimed. A fresh complete run was
started detached with output in tools/logs/icicle-emulator-check.log.
The C64 combined footprint command requires VICE and could not test this
C16-only tool installation; no VICE was installed to satisfy that command.

Initial HTTP requests for the reference images returned HTTP 465. A
Mozilla user-agent succeeded over both HTTP and HTTPS; the original
instruction leaflet, external title/play images and published map were
saved. No game program was downloaded. The feature checklist was written
from the original leaflet before code annotation.

## Orientation, source scope, and annotation

The complete detached emulator suite passed all 46 checks. The source
snapshot stops at `$6000` after unpacking; steady play uses a later snapshot.
The supplied image needs 64 KB, so the emulator uses plus4pal. The unused
lower copy, generated grids, copied keyboard ROM, and retained duplicate
tail were excluded by byte comparison and startup tracing. No full game,
ROM, or snapshot is carried by a page.

Regenerator runs on 3010 because another checkout owns 3000. Starting its
bridge on a synthetic project outside a game folder failed; the normal
game-folder launcher generated the Plus/4 project correctly. The JSON
--apply endpoint rejected empty labels; direct logged API batches cleared
the internal generated aliases. The symbol export then measured all 26,129
authored bytes: 6,929 code and 19,200 data. A bare work/entry.p4emu argument
did not resolve; listing.py succeeded with the full repository-relative
snapshot path recorded in orientation.md. Source and entry comparison use
the same canonical symbols.

## Verification and independent sample

Live checks covered all room loads, keyboard and joystick intents, title
options, pause/resume, sacrifice, abort, timeout, an assisted extra-life
threshold, and assisted five-letter name entry. Four consecutive countdown
intervals measured 51 IRQ hits apiece. The two monitor cheats were tested
and the original play snapshot restored afterward.

The independent checker gpt-6-astra received a cold brief and the seeded
80-comment sample. The parent waited throughout. It returned 75 right and
five wrong-detail verdicts. Each of the five findings held and was fixed
in the live project before the canonical export and listing rebuild.
The strata, counts, uncertainty, and recommended later audit are recorded
in facts.md. The sample and checker evidence stay in ignored work/.

## Minisite and retrospective

Built How it works, Maps, Graphics, and Discoveries; Source is generated
from the listing. Shared pure widget code is identical in all four pages.
No Play tab was needed for Silver; a full port is left as a possible later
contribution. Both tunes and four effect examples use original-routine
sound writes with the shared TED sound renderer. The two tune write streams
match independent plus4emu value/order captures. Processor-cycle timing
within a frame does not reproduce TED bus delays; the caption says so.

Committed tests check all sixteen room loads and assembly prefixes, the
complete 24-update animation period, all 256 glyphs in monochrome and
multicolour modes, 4,096 water cases, 5,120 countdown cases, and all 256
name-input bytes plus editing sequences. Separate private routine checks
covered 2,048 magic-grid cases, 64 door cases, and falling-object flags.
The rebuilt display differed at zero of 64,000 pixels from the frozen
emulator reference.

The full site built 113 games and 1,297 pages. A pre-existing missing
levels_tab warning belongs to games/c64/lethal-weapon. Local GitHub
contributor lookups lacked a token; CI supplies one. Browser checks at
1280 by 1000 and 390 by 844 found no script errors or horizontal overflow
on all four pages. They exercised all rooms, assembly counts, animation
states and orientations, water controls, six sound buttons, directional
controls, countdown, and name entry. Screenshots and browser evidence are
in ignored work/browser.

The source footprint diagram clipped authored Plus/4 RAM at the C16's
16 KB limit. The build script now chooses 64 KB for a listing extending
above that boundary, with three regression cases. No skill workflow was
changed, so this script fix needs no lesson or kit version bump. Reference
captures unused by the pages were moved into the ignored work cache.
