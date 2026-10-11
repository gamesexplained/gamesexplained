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
