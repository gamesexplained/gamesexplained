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
