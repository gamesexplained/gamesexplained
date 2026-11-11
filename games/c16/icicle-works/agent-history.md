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

## Final copy and delivery checks

The draft pages were committed before the ELI15 rewrite. The rewrite
explains memory addresses, display interrupts, character shapes, and sound
registers on each relevant tab. A sentence-by-sentence comparison retained
the technical conditions; a separate text check retained every numeric
piece of evidence. The copy remains agent-draft pending human curation.

The four required checks passed before the draft commit: no game binaries,
documentation separation, 609 matching listings, and 50 affected tests
(49 passed, one unrelated Spectrum media test skipped because SkoolKit was
not installed). No Spectrum analysis depends on that skip. The checks are
repeated for the final copy commit. PR review screenshots show the base
branch's three-entry C16 catalogue and the new explanation pages.

## Full audit requested by the contributor

The contributor requested a full audit after the Silver PR opened. PR #875
was open, so this work continues its existing branch. A listing rebuild
from the entry and stable-play snapshots reproduced the committed result.
The 242-comment population was frozen in ignored work/reports/audit-20261111.
Two fresh gpt-6-astra checkers worked sequentially with cold briefs and
no access to one another's findings. They checked 138 and 104 comments.
All nine wrong-detail findings held on parent review. Ten comments were
corrected through a restarted canonical disassembler session, including
the repeated restoration condition at $851B. The export retained 55 blocks,
878 symbols, 242 comments, and 100% coverage of 26,129 authored bytes.
Only the intended ten comment fields changed in the listing.

The title animates brick glyphs rather than icicles. A small Graphics
viewer now demonstrates all sixteen phases; its pure JavaScript rotations
agree with 256 original-code updates, including the frame-counter wrap.
The article states the music-restoration condition and facts.md gives the
two-column rank-10 layout. The two original-code audit suites passed all
40 and 22 groups, with complete room and data checks. Evidence, scripts,
source copies, and verdicts remain in ignored work.

The title rule also passed a live 32-interrupt plus4emu check, with an IRQ
counting control and unchanged icicle bytes. A partial local game rebuild
left the browser's service worker serving the previous page; the new
viewer was missing from that cached DOM. Browser validation bypasses the
service worker and HTTP cache and then passes all controls and sixteen
distinct title phases on desktop and mobile. The failure was visible in
the new-widget assertion, and required no product-code change.

A third fresh gpt-6-astra checker took no part in annotation or auditing.
It checked the seed-202611112 draw: 60 written and 20 generated comments.
All 80 exact verdicts were right, with no doubtful or unverifiable rows.
sample.py count validated the unchanged drawn texts and reports 0/80,
Wilson 0-4.6%, and a weighted observed rate of 0%. The parent reproduced
its 25 original-code test groups. The accuracy ledger retains the first
sample, full audit, and new sample in that order. No repeat audit was
needed because the new sample is within the kit's mark.

The new copy was reviewed separately for plain language and numerical
evidence; the Graphics caption explains two bits as one wide pixel.
The original annotation PR was still open and its earlier CI passed when
checked before audit delivery. The required checks and full site build
are run against the completed audit before the new commit.

## Room-network overview requested during curation

The contributor requested a clearer visualization of the door network.
PR #875 remained open, so this continues the existing branch. The Maps
section replaces the numbered room bar with an interactive SVG overview
of all sixteen room miniatures. It groups the 42 original doors into
24 connections and shows the six one-way links with single arrowheads
and dashed lines. The selection highlights outgoing connections and
updates the detailed map, toy, and door buttons. Zoom, Fit, native panning,
keyboard activation, and touch selection are supported.

The layout follows the topology to keep connections readable; it does not
assert geographic room positions. Thumbnails use the page's existing
room renderer. A new test compares every graph door and direction with
the original room loader's runtime grid. The existing listing and its
audit sample are unchanged. The copy received its own plain-language pass.
Browser checks cover all sixteen selections, arrows, one-way badges,
keyboard and touch activation, zoom, and mobile containment.

This begins the contributor's section-by-section curation, so the metadata
is silver-claimed with jankfoundry as steward; copy remains agent-draft
until the human copy pass. The remaining curation is listed in TODO.md.
