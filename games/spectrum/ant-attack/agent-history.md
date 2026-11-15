# Ant Attack — agent history

## 6 November 2026

The contributor selected the Spectrum version and Silver, supplied the
TZX ZIP, authorized research and PR/issue delivery, and requested credit
as GitHub account air. The contributor identified the session model as
`gpt-6.1-sol`, reasoning high. A detached empty commit verified
Aaron Bell <air@users.noreply.github.com>; it was left off the game branch.
The repository branch is `game/spectrum/ant-attack`; its initial push dry
run succeeded. Tools were installed only after explicit approval.

ZEsarUX 13.0 and SkoolKit 10.1 were installed under tools/. Python
3.12.14, Node 24.22.1, and SDL 1.2 were already available. Emulator checks
passed 47/50 with the three recorded limitations. The footprint check was
clean. The SkoolKit launcher reported 103 MB by summing virtual-environment
paths; disk usage was about 18 MB, so the installation notes' small-size
estimate was closer to actual occupied space.

ZRCP smartload rejected the uploaded filename containing a space as an
unknown format. Copying it to `work/ant-attack.tzx` worked. The first
attempt to capture entry stopped on an opcode limit in the loader; that
file was replaced only after a verified PC=$9700 stop. Tape-to-entry
comparison then matched all 41,984 main payload bytes. The listing comes
from that machine state, not a composition of extracted files.

Feature research preceded code annotation. The original instructions
resolved 0 versus O in a contemporary review. Direct decoding of BASIC
made the ten-rescue structure, score multiplier, target variants, and
ant divider policy explicit. No imported disassembly was used.

The executed-address map covered movement, rotation, jumping, grenade
inputs, and all camera views. Recursive tracing added paths the short
play session did not reach. Retained code and shapes remain labelled as
such rather than assigned invented gameplay uses. Generated buffers were
separated from authored data by snapshot comparison and their writers.

Independent mathematical tests covered 120 occupancy cases, all sixty
masked shapes, 512 projection indices, and the 37 target triples. The
first projection formula missed the odd-band byte offset; the test caught
it and the verified formula includes that offset. Live tests covered
keyboard masks, camera precedence, grenade masks, timer division, and
escape conditions. Legal short/all-key grenade recordings matched on two
machines for 36 passes. The reconstructed screen matched all 49,152
active pixels by colour number.

A `gpt-6-astra` checker worked alone while the lead waited. Sample seed
610106 checked 111 comments, including separate padding/map/shape strata.
It found 17 detail errors: fifteen premature claims about a page viewer,
one actor-identity assumption, and one strict-distance boundary. All were
corrected, including every instance of the shared viewer sentence. The
sample is recorded in game.json and facts.md; a full audit is recommended.

The minisite has How it works, Discoveries, Map, and Graphics, plus the
generated Source and About tabs. It includes all sixty shapes, all target
triples, seventeen sound sequences, and the extra grenade-fuse widget.
The sound test rebuilds the sequences from listing bytes with a small
runtime-state fixture and a locally installed ROM. ROM bytes are never
committed. Title and timeout port writes were captured in the emulator;
the independent machine agreed within six T-states per edge interval.
There is no Play tab: this contribution explains the original and does
not provide a behavioural port of its complete game loop.

The final readability pass defines the memory links, BASIC, engine passes,
and sound cycles where they first matter. An ant-decision widget exposes
the strict distance boundary. Browser checks exercised all authored tabs,
sixty shape records, seventeen sound choices, the ant/follow/score/fuse
controls, and mobile widths. A sound-selector width overflow was fixed.
After the environment resumed, stale Chromium singleton links in its
contained test profile were removed before relaunch; no personal browser
profile was used. Review screenshots are kept under review/ and are not
published by the site build.

The sound test accepts either the contained SkoolKit installation or a
Python-importable pip installation, matching the CI workflow. Both lookup
paths were exercised locally without installing another package.

## 15 November 2026

A quality pass at Aaron's request (a second model, `claude-opus-5-5`).
He asked for a better intro, a working FLASH demo, a section on the
game's messages, plainer and more visual follow and ant sections, one
gallery of every moving picture, and the walking-frame and test sections
cut.

The game was run on the kit's 48K machine from the earlier play state.
Each message was captured as it finished, and the BASIC screens (welcome,
score card, time up, hero, medal) were reached through real escapes. The
first medal route left the long rescue-1 story in `c$` and stopped at
line 3610 with out of memory; a route with the right story text did not,
so no bug is claimed. The old FLASH demo toggled a screen with no flashing
cells; the page now uses the READY WHEN YOU ARE screen.

New live checks: the follow distances and SCAN colours, the bite lift,
the retry clock (957 then 956), and ant speeds (349 of 367 passes for ant
1, about 184 for the others). Reading BASIC lines 140–190 showed why ant 1
is fast. A search of every write to an actor's picture field showed that
no code selects `$F0–$F3`, which the Discoveries tab now shows. The page's
facing rule is checked against `$8A91` on the kit's CPU in
`test_widgets.js`, and `site-browser.js` was rewritten for the new widgets.
The process paragraphs moved from the pages to facts.md.

Later the same day Aaron pointed out that the four unused pictures at
`$BC00` are an aeroplane, which Unseen64 reported in 2009. Comparing the
four showed exact mirror pairs (`$F0`/`$F3`, `$F1`/`$F2`), so they are one
plane facing four ways. Discoveries, Graphics and facts.md now say so and
credit Unseen64. Neither Unseen64 nor the current Wikipedia article gives a
reason for the plane.

