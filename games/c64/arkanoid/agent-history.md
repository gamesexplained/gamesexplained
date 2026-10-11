# Arkanoid — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 5 October 2026: run on claude-opus-5-5, kit 0.0.60

**Orient.** The upload is a G64 of Imagine's disk. VICE's defaults loaded
it through the custom fast loader with nothing changed; at warp the
hand-over came about 76 s after autostart. Polling the program counter
every 0.2 s while it loaded showed the loader living in the stack page
(`$0130`-`$01D8`); a disassembly of that page during the load showed the
exit, `JMP $9400`, and a stopping checkpoint there gave `entry.vsf`.
`c1541 -read` then showed the main file, `arkaniod`, is the whole of
`$0400`-`$FFF9` exactly as it sits at the hand-over, so no unpacking
happens after the load.

**The start-up hides its path.** `$9400` and `$095A` are written with
undocumented `NOP`s, so the disassembler's flow trace stopped at once.
The code after `JSR $B9C3` at `$095D` (`LAX $F004`, `JMP $F000`) looks
like the continuation and never runs: `$B9C3` leaves by `JMP $F000`.

**Running the game in the kit's simulator found the code.** The
simulator (`kit/c64/machine.js`) started at `$9400` stalled in `$5F42`,
which waits for CIA 1's serial port to finish shifting a byte, a part of
the chip the simulator does not model. A hook at `$5F5C` that writes the
value VICE leaves in `$BA65` and resumes at `$5F83` got it past. Then
five scripted sessions (attract mode, a joystick game with random input,
two-player keyboard, mouse, paddles) executed 5,816 instruction addresses,
765 of them outside what the flow trace had found. Seeding the
disassembler with every one raised the code from 13.6 KB to 15.3 KB.
The input menu stalled the first script: fire on port 2 brings the menu
up from the title, and only fire on port 1 (after J) starts the game.

**Network.** Every page fetch was refused by the session's proxy (C64-
Wiki, Wikipedia, the Internet Archive and its Wayback Machine,
c64online); web search summaries were the only outside source.

**Annotation, in two waves cut short.** Nine agents on disjoint ranges
used up the session's usage limit within about nine minutes; the
container restarted before the limit reset, and the disassembler was
rebuilt from the agents' logs with `r2000.py --replay`, which restored it
exactly. A second wave of five agents on larger ranges reached 97 % and
hit the limit again; after the reset the one unfinished agent was
resumed, and the run continued as a single agent. One agent corrected an
early claim of this run: the start-up does not decrypt `$BA0A`, it
scrambles a second protection check that is plain code in the file.

**Verify.** The round index `$093D` and the bricks-left count `$0455`,
set in round 1, take the game to any round at the next brick broken;
that gave the references for rounds 2, 3, 4, 10, 18 and 33. The lives
cheat and the extra-life threshold were tested with checkpoints and pokes.
A capsule's letter could not be read from the multicolour table and was
read from a zoomed screenshot instead (green, C).

**Minisite.** The page's sound driver, run in a small 6502 interpreter
from `listing.json`, stopped on the ending tune at `$2A27`: the byte there
is the opcode of a `BIT` skip trick that no agent had typed, so the
listing left it out. Four such gaps were typed and described, and every
tune then matched the simulator's recording write for write. The play
tick rate (two driver ticks a frame, one on the title) was measured live
with checkpoints before recording.
