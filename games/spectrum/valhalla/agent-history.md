# Valhalla — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 10 October 2026, one agent from start to pull request

**Setting up.** ZEsarUX 13.0 and SkoolKit 10.1 went under `tools/` by
`tools.py`; `check-emulator` passed 41 of 45, and the four failures each
have a workaround in `kit/skills/spectrum/tool-zesarux`. The tape is the
TOSEC `Valhalla (1983)(Legend).tzx`: four files at ROM speed, so it
loaded with no turbo handling. The BASIC autostarts at line 9800, and the
hand-over snapshot, `work/entry.sna`, is taken on that line before its
first statement.

**A game in BASIC.** Most of the game is the BASIC program and the arrays
saved with it, and the kit's listing had no way to show either: SkoolKit
types them as bytes. `kit/spectrum/basic.py` was written to read the
program and the variables as the ROM keeps them, with `test_basic.py`
holding it against SkoolKit's own BASIC lister, and `listing.py`,
`source.html` and `build.py` taught to list a BASIC block a line or an
array row at a time. The annotations were written as Python lists of
blocks, labels and comments (machine code, BASIC lines, variables) and
turned into the control file by a script, which made the corrections in
`60-verify` a matter of one edit and a rebuild.

**The quest search.** A search over every state (who carries what, where
each character is) ran out of memory at 3.7 GB. The search kept for
`features.md` takes every condition but a quest object as met, which is
enough to show the order the special places force and no more; the page
and `features.md` say so.

**A breakpoint that never fired.** One picture check typed a move from
a poked location and set a breakpoint on the graphics entry. The move
was refused, because `cango` reads the exits that `mprop` unpacked for
the location before the poke, so the breakpoint never fired, ZEsarUX's
`run` timed out and the emulator stopped answering. Stopping and starting
it with `tools.py` cleared it; the checks then poked the location one
step away and walked in.

**Pictures.** All 81 pictures were drawn in SkoolKit's simulator by
porting lines 7010–7039 (the commands each place sends, with the ROM's
`RND`) and running each command through `$F7AF`. The first comparison
with the emulator, 600 frames after arriving, differed by 14 bytes: the
emulator's picture was not finished. At 1,500 frames, 13 places matched
to the byte. `test_pictures.py` keeps the sheet and the page's command
list honest.

**Verify.** The independent check of 60 comments found 7 with a wrong
detail, all fixed. Reading line 4010 again for one of them showed that
`features.md` and `facts.md` were wrong in a bigger way: they said no
character follows you, from line 5500 alone, when line 4010 brings one
from the place you just left. A second slip turned up while building the
route stepper: the route to Felstrong's cave marked live in `facts.md`
was one worked out from the map table, not the one walked in the
emulator (west to 69, then ringways through 51 and 21). Both were
corrected from the code and from the run's own log.

**Fights.** The first live fight failed because Idun walked off while the
command was being typed. Changing one keyword in the program in the
snapshot, `PEEK` to `ABS` in line 4060, stopped every character's
actions, and `k3` to `lc` in line 5512 stopped the crowd from thinning;
the five fights then ended as lines 1362–1376 say.

**The page.** The widgets read `listing.json` through `Spectrum.load`.
Looking at it in Chromium found "you defeats Idun" in the fight
calculator and a column of the character table out of sight to the
right; both were fixed before the copy pass.

**The audit.** Aaron asked what makes a listing good enough, and then for
a full audit. Three fresh agents took the BASIC with its variables and
two halves of the machine code, one brief between them (`work/BRIEF-audit.md`)
listing the kinds of slip the first sample and Commando's audit had
found. They marked 122 of the 644 comments wrong in a detail, 18.9 %
against the first sample's 11.7 %: the machine code was 24 %, the BASIC
8 %, so the first sample's 39 machine-code comments had drawn lucky. Two
slips repeated across ranges (`draw_ridge` runs counted in steps, merlons
one short) and each auditor named the other's instances, which made the
merge a check of its own. Two findings were only in the notes, not the
verdicts; both were checked against the code and corrected. The
corrections went into `work/valhalla.ctl` by address, matched on the old
text, and `symbols.json` and `listing.json` were rebuilt from it. The second sample, by a fifth agent, found 2 of 60 wrong (3.3 %).
That fails the pass mark first proposed on #318, one wrong in 60; working
out how often that mark passes a listing at a given rate showed it fails
one at 3 % about half the time, so the proposal there was revised to two
in 60, which passes a 3 % listing about three times in four and a 10 %
listing one time in twenty.

## 11 October 2026, the Characters and Maps tabs

Aaron asked for a character browser, for what goodness does between
characters and its corner cases, and for how the game makes its
characters seem to lead lives of their own; and to split the maps and the
characters into tabs of their own. One agent did it, in a fresh cloud
session.

**A cheaper live harness.** ZEsarUX was not installed in this session.
SkoolKit's `tap2sna.py` made a snapshot from the tape (it stops at the
`USR` in line 9800, with the game's variables set), and the kit's own
Spectrum, `kit/spectrum/machine.js`, ran it headless at about 800 frames a
second with SkoolKit's 48K ROM. Typing went in through the keyboard
matrix, and the 20-line text area `n$` was read straight from memory
after every pass, which gave a transcript of everything the game printed
without reading the screen. `tap2sna.py --sim-load` is read by argparse
as an abbreviation of `--sim-load-config` and fails; plain
`tap2sna.py valhalla.tzx loaded.z80` simulates the load by default.

**Idle runs.** Two runs of 400,000 frames with nobody typing, one from
the start and one with you put beside Saga, gave the counts on the page:
every attack between characters 7 or more apart in goodness, every gift 3
or less, no goodness changed, 20 and 31 characters' rows untouched to the
byte, 26 minutes of a lone companion doing nothing, and 42 orders given,
41 to characters with brains above 7. The pairs became the fixtures of
`test_characters.py`.

**The crash.** The goodness-0 crash in `facts.md` had been seen only
with your goodness poked. Reading line 1452 showed that a throw you order
makes the target's counterattack count as your command, so the target's
own goodness steps. From the tape's start with nothing poked, ordering
Thor, Idun, Skadi and Odin to throw at Loki reached "B Integer out of
range, 1356:8" after ten minutes of play. The first script kept typing
after the error and wandered; the third stopped at the report.

**Wrong turns.** The first draft said line 5523 sends a character on
without `dep`; it is never reached, as `h0` is always the location here.
"Loki leaves." at the start was first put down to his own turn; the
`GO SUB` stack in the snapshot (return address for line 8120) showed it
was the stage manager. The asking rule was first written as seven in
eight when you ask the same one twice; `la` is set by every ask,
anyone's, and by trades, and the overall rate is 11 in 12. The inlay
mapping in `facts.md` had missed Tyr's bravery, found when the browser
showed the inlay's numbers beside the game's.

**The pages.** The maps, the pictures, the quest route and the two bugs
about places moved to `levels.html` (Maps); the cast, goodness and the
characters' lives are `characters.html`. The shared script and styles
moved from `index.html` into `reference/valhalla-page.js` and
`reference/valhalla-page.css`, so the three tabs share one port, and the
tests ask that file for it. Looking at the pages in Chromium at 1200 and
390 pixels found the character panel overlapping its picture, a price
column too narrow, and the qualities table squeezed on a phone; all were
fixed before the copy pass.
