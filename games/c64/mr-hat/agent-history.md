# Mr. Hat — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 30 September to 2 October 2026, the Silver run (claude-opus-5-5)

**Set-up.** The contributor's machine already ran a web server of their
own on port 6510, the emulator's MCP port. Rather than stop it, the kit
grew `KIT_VICE_PORT`; the first call after that went to the contributor's
server anyway, because the variable did not survive between the agent's
shell commands, and the server answered 404. The launcher now writes the
port to `tools/vice-port` and the clients read it. Rust was installed
inside `tools/` with `RUSTUP_HOME` and `CARGO_HOME`. Three runtime libraries
for the emulator needed `sudo`, which the contributor ran.

**The tape.** The T64's one program unpacked, in the kit's 6502 simulator,
to a second depacker, so the boot went to the emulator. A stop on the
second stage's call-out (`$0690`) and then on the routine it jumps to
(`$0948`) showed a freezer restore: colour RAM from `$0200`, the VIC, SID and
CIAs from small tables. A range checkpoint over `$0A00`-`$FFFF` stopped at
the KERNAL's IRQ entry instead of the game (the resume enables interrupts
and one is pending); the resume routine was on the stack page, and its
`RTI` went to `$1773`. The stack above it held the game's call chain
back to BASIC's `SYS`, which gave `$086D`; the game's BASIC line `10 SYS
2157` was still at `$0801`. A first restart test at `$086D` silently did
nothing (the register call took the wrong arguments and the machine was
not stopped); the second, done properly, rebuilt the hand-over byte for
byte.

**The wrong control.** Room 1's play snapshot was saved just after the
stick had been held up, mid-jump, and the first reading of it was "up
jumps". That went into `features.md`, `facts.md` and the agents' brief as
established. Agents 2, 3, 4, 5 and 7 each found from the code that fire
jumps and up only climbs; a live test from a standing start confirmed
them, and the brief was corrected while four agents were still running.
The page's control section is built on the corrected reading.

**Nine agents and the usage limits.** The annotation was split across
nine agents on disjoint ranges. All nine stopped on the account's
session limit within minutes, having read but not written, and the
step's clock ran on for about five hours of nothing. Relaunched after the
reset, they ran for an hour and stopped again, on the weekly limit this
time; two had finished. Resumed by message after the reset, keeping
their contexts, and told to write in small batches, the rest finished
within the afternoon. The figures in `timings.json` include the waits.

**Claims checked against the bytes**, one or more per agent: the A4
entry of the note table and the end message (agent 9); the `$400B` slip
(agents 8 and 7, found independently, checked in four snapshots); the
fire test at `$86E3` and Lupenio's replay text at `$7FB5` (agent 6); the
lives cells before and after a death (agent 2); the 278-byte loop copies
(agent 4); the missing index at `$18B3` (agent 1). Agent 5's F1 "pause" was
wrong: a live test showed F1 stops room 1's tune and the guardians keep
moving; the comment was corrected.

**Live tests that did not settle.** The ending: room 11 entered by
jumping into its set-up kept moving Mr Hat back from where he was poked,
so the win routine never ran. Two guardians on Mr Hat at once: the room
enables different sprites in different frames, and the test could not
hold two enabled ones on him in the same frame. Both are recorded as
traced.

**The page.** `frame.py capture` rebuilt ten rooms and both dark rooms
with no pixel different; room 10, which has no interrupt handler of its
own, failed to settle the beam's position in three tries and the page
uses its screenshot. The title tune's player was ported and matched the
game's own code write for write over 6,000 interrupts. The Chrome
extension was not connected, so the page was checked in Playwright's
cached headless Chromium: a full-page screenshot, and a copy of the page
that clicked all 45 controls and reported no errors.

## 2 October 2026, additions on the same branch (claude-opus-5-5)

At the contributor's request, after the pull request was opened: the
two in-play tunes ported and checked write for write (`work/voice3-test.js`);
a sprite gallery and Mr Hat's animations, with the death dissolve run
from the game's own code in the simulator; `drawSpriteMC` added to
`site/lib/c64.js`. Room 10's frame failed in `frame.py` because `phase()`
counted wraps from drops in the line; it now counts them from the
stopwatch, and room 10 rebuilds with no pixel different. Room 9 was
drawn with its five switched-off instructions put back. A first reading
of room 1's tune as "out of tune" was dropped: its first column varies
between repeats of the same note, so it may never have been a tuning.

Then a consistency pass over the nine agents' annotation: neutral names
for the zero-page bytes that two subsystems share; names for the sprite
pointers, lives marks, carried-item cells and status digits that the
listing showed as automatic labels; `kill_hat` for the shared death
entry and `room1_kill_hat` for room 1's; `room7_` for four `r7_` labels;
the F1 routine's label no longer says pause; room 9's loop no longer
calls `$D8` = `$40` a kill (it is the last life gone, `$1734`). The
switch-to-barrier table, which rested on one agent's reading, was
checked flag by flag.

## 3 October 2026, after the maintainer's review (claude-opus-5-5)

The review traced twelve of the page's claims and found five wrong; each
was checked here against the bytes and held. All five were claims
generalised from one test or one room: the collision values of `$55B0`
given as the game's (four tests have four lists, and room 1's kills on
sprites 3 and 6 together); the `$1020` slip's effect worked out from the
counts without reading the callers; "room 1's tune", from a live test in
room 1 only, when the player sits on the interrupt tail of every room
(live, its pointer moved on in seven rooms); a map edge missed although
the notes held it; and a caption's "only ever" contradicted by the
title's cast. A fresh verifier agent then checked every claim on the
page, about 120: six more wrong (the worst, the slip again: 23 of the 24
right-half spots are gated by their callers, so 19 of them work only
because of it), one unsupported, twenty imprecise. Each was checked
before it was changed, and one of its suggestions (naming a room for
`$4C40`) was not taken because the callers did not support it. The web
screenshots left `reference/`, where the build would have published
them.

Then, before replying, two more audits by fresh agents. `facts.md` and
`features.md`, every claim: eleven rows wrong, most of them lists given
as complete from a partial search (a fifth switch-and-barrier pair, a
fourth carried object, room 3's deaths that cost two marks by the code)
or one instance generalised (room 9's loop, the STAGE digits), and the
RUN/STOP vector read from the loader rather than from the game's own
memory. The audit also connected two findings that had sat in different
sections: the "impossible" pickups include room 5's object, which the
ending needs. Tried live, the object cannot be taken; but the ending was
reached anyway, with Mr Hat carrying nothing, because room 11's block is
missing its colour fill too and counts as open. A random sample of 60 of
the 1,268 listing comments, about seven from each annotation agent's
range: 15 with an error (25 %, 95 % interval 16-37 %), 14 of them details
(callers, rooms, counts) and one a misattribution (`room2_guardian_hit`,
which runs on room 3's ladder). All fifteen were corrected, the same
wrong sentence in agent 9's other table comments with them, and every
explicit caller citation in the listing (221) was checked mechanically:
one more was misleading.

Then the whole listing. Nine fresh agents, each on a range of about
5,000 words of comments, checked all 1,268 against the bytes and
corrected 235 of them (18.5 %) and nine labels, listing callers with a
helper that reads the decoded listing (`work/callers.py`), since byte
searches had put phantom callers into comments. Among what they found:
fire with a direction jumps from standing (confirmed live, and corrected
on the page), the F1 replay and both replay bonuses never run, the
"television" sprite is the lift cabin, and a live block of room 1's code
had been labelled unused. A second random sample of 60, none from the
first, checked by another fresh agent: 58 correct, 2 with a minor error
(3.3 %, 95 % interval 0.9-11.4 %), none wrong; both were corrected.

## 4 October 2026: three copies compared

After the merge, the contributor added two more copies: the disk they
own, `mr hat (original).D64`, and a fixed version by botowrap. The disk
is side B of *Commodore 64 Club* issue 14 (its directory matches the
German C64-Wiki's list for that side), and its `MH` file turned out to be
the GameBase tape's one file byte for byte: the "freezer backup" the
analysis had treated as someone's copy is how the magazine shipped the
game. Started from the disk, the machine at `$1773` equals `handover.vsf`
in all 65,536 bytes, so the listing stands, and `orientation.md` now
starts from the disk; its old line that the tape was "not the magazine's
own" was wrong and is gone.

The contributor had heard that the title's font breaks after a game
over. The diff with botowrap's version led straight to it: his file puts
back 14 bytes of the font source at `$CE48`, equal to the copy at
`$2848` that the frozen image still holds. A full game in each version,
with a store checkpoint on the font page, confirmed that the game never
writes there and that only the original comes back with broken I's. The
end screen captured on 3 October already showed the broken I's in
"FINISHED" and "MISSION"; nobody had looked. The ladder change is the
only other difference; its clean pattern exists nowhere in the original,
so it is recorded as a redraw, and whether the original ladder was
damaged stays open.

Before the listing comments were edited, the disassembler's saved
project was found to hold the comments from before the full audit (275
differ): the project file had not been saved after the audit's last
edits. It was rebuilt from `symbols.json` with `symbols_import.py`, and
an export round-tripped without a change before anything was written.

A fresh agent (claude-opus-5-5) checked the 70 new claims against the
bytes (`work/reports/verify-versions.md`): 4 wrong, 10 imprecise, 1
unsupported. The worst: `restart-title.vsf`, described since 30 September
as a restart at `$086D`, is not one; a real restart passes the title
set-up and copies the damaged font at once. The restart was redone live
(`versions/d64-restart.vsf`): the first title shows the broken I, and
memory differs from the frozen image only in the font's copy and a
music counter, so botowrap's version was compared again against that.
The agent also found that rooms 5, 6, 8, 9, 10 and 11 draw their ladders
from the same row through the shared copy `$5713`, whose operand they
patch, which the reference search cannot see. All were corrected.
