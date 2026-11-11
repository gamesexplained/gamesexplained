# Kikstart — agent history

## 11 November 2026 — jankfoundry, kit 0.0.323

The contributor supplied a PRG and chose Silver, web research, and an
agent-opened pull request. Their selected model was GPT-6.1 Sol Extra
High; the lead recorded gpt-6.1-sol. GitHub authenticated as jankfoundry.
Upstream push access was refused, so the branch uses the existing fork
jankfoundry/loderunner-ge. A detached identity-check commit proved the
GitHub noreply author before the game branch was created.

The tools were installed with approval under tools/: local Rust via
rustup, regenerator2000 0.9.20, and plus4emu 1.2.11 at 939e652 with the
kit patch. Both PAL models passed 46 checks. The footprint was clean.

The PRG stopped at $2000 after unpacking. Its entry screen still held
the title, but engine start immediately replaced it with attract play.
The screenshot first named title.png therefore showed attract mode;
the published title image is explicitly credited to Plus/4 World.
Comparing entry and play showed every byte $1000-$3FFF unchanged.

The first timer interpretation missed the extra DEC at $2363. A controlled
100-frame comparison showed two seconds of countdown, which agreed with
two hundredths per pass. Matched control snapshots established the
reversed printed keyboard directions. The built-in selector reached
course 16 without memory patches.

The loaded-data audit first exposed the graphic banks and full terrain
stream outside automatic symbol spans. A preliminary exclusion of the
last forty bytes was removed: they differ from power-on RAM and are
inside the screen's look-ahead. The base pointer's wrap and the window
extent were recorded separately. Every authored byte and engine gap was
typed and described, including the loaded title.

The independent checker used an explicitly selected gpt-6-astra with
xhigh effort and no surrounding analysis history. Its first execution
request hit `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`
and silently waited 637 seconds on escalation. A later combined tool
call stalled for 305 seconds. Interrupting the checker surfaced those
blockers. The successful fallback was to run the checker's own evidence
scripts through the lead's working tool path, and save its message
batches verbatim against the frozen sample keys. The lead did no other
analysis while the checker worked. All 116 comments received exact-text
verdicts. The two upheld findings concerned the final gap and the
surface predicate. The latter belief also appeared in the airborne
comment, so that comment was corrected too.

For the rebuilt frame, the main-loop work was held while the raster
handler kept running. A renderer using four pixel bands matched the
emulator's 320x200 window with zero differing pixels. The frozen code
patch and whole snapshots remain private. The page carries only the
display data required to draw that frame.

The page test loads script blocks directly from the authored HTML and
checks mechanics and renderings against the committed listing. During
browser setup, a private helper named inspect.py shadowed Python's
standard module and broke websockets; renaming it fixed the import.
The browser uses an existing Chromium headless-shell, a repository-local
profile, and Python CDP calls, with no new browser download.

After the checked draft pages were committed, a separate copy pass defined memory and character terms, simplified the prose, and checked that every script block stayed byte-for-byte unchanged. The sound heading was aligned with the two distinct voice roles. Copy remains agent-draft pending human curation.

## 11 November 2026 — requested full audit

The contributor requested a full audit on the still-open PR #864. The
canonical snapshot rebuilt the listing without differences. A fresh
independent checker audited all 294 comments and facts.md. Its 13
findings were upheld after instruction/byte review and reproduction of
25 simulator groups. These covered axes, glyphs, strict comparisons,
conditional effects, a NOP count and a surface sample. The alphabet and
last readable terrain byte were corrected in the reference notes.

A second fresh checker then checked the new seed 2026111102, without
reading the audit's verdicts or evidence. Its 116 comments included
separate generated strata. It found two missing helper conditions; the
lead upheld both and reproduced all 26 independent simulator groups.
Both sampled comments were corrected, along with a related helper's
wording. The measured 2/116 rate remains recorded even after those fixes.
All corrections went through r2000.py, followed by symbol export and
listing regeneration. No game bytes or page widget logic changed.

## 11 November 2026 — complete route

The contributor chose a replayable sixteen-course route as the next step.
A search used the original movement, terrain, object and collision code,
with drawing omitted only during search. A complete timed-machine replay
then checked the candidate with drawing and interrupts. The final route
uses five ordinary crash/recovery sequences; no memory patches are used
by the plus4emu replay.

Fresh PRG boots supplied the initial random seed. A read-before-write
check found three nonzero dependencies, $2C-$2E=$10,$D6,$28, left by the
cold loader route. The published test starts all runtime RAM clear and
sets only those bytes. The input sequence replays on that timed C16 and
on plus4emu read by read; 370 evenly spaced emulator checkpoints agree,
with four further checkpoints for resumed control on the next lap.

The final wrap reuses $2F10's finish marker. The bonus increments the
course counter to 16, then riding resumes. The route also exposed that
the course time table credits the existing clock instead of replacing
it. The Levels prose and widget label now state credits. The new input
recording, trace viewer and original-code replay test carry that result;
the listing's audited comments needed no further changes.
