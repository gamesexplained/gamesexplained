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

## Typed data no label reached (22 October 2026)

#455 made the ledger count typed data, and bytes under a line comment,
that no label reaches, and the listing then left out 84 bytes (#468):
the silver and gold brick table `metal_pos` runs from `$03AA` to
`$0453`, and its labels' spans stop at the memory-map edge at `$0400`. A
line comment at `$0400` describes slots 43 to 84. The original disk
from the C64 Preservation Project, the same image as the contributor's,
reached `$9400` with the listing's bytes except two in zero page (`$00`
and the jiffy clock at `$A2`), which were written back from the earlier
listing into `work/entry.vsf` before the rebuild; the unpatched snapshot
is `work/entry-raw.vsf`.


## Controls, more Graphics and the sound effects (20 November 2026)

Brought the tabs in line with the other C64 games: a Controls tab (the
menu, the four device readers, a widget comparing the joystick's step
with the paddle's halving, and the Neos mouse bug); the Graphics tab
now opens with every animation at the game's rates, all 104 play-screen
shapes and the intro's bank-1 sprites, with the loading picture after
them; the Music tab gained a player for the twelve sound effects, run on
the game's own driver, and `test_effects.js`. The listing could not be
rebuilt (no snapshot in `work/` in this container), so four listing
comments that the code contradicts are listed in `TODO.md` instead.
Reading the effect callers corrected an earlier guess: sprites 0 and 1
take the Vaus's X each frame and sit over it.

## The bricks (21 November 2026)

The contributor found nothing on the site about the bricks: their colours,
points or graphics. Added a Bricks and a Silver section to the Levels tab
and a Bricks section to the Graphics tab, all drawn from the listing.
Running `draw_wall`, `brick_hit` and `silver_shine` on the kit's 6502
showed that a silver brick counts a hit only when its shine ends, so hits
8 frames apart or closer never break it; that silver is worth 100 in
every round, because its colour RAM gives white's entry; and that gold's
face is the second shared colour, light blue. `test_bricks.js` holds the
table and the silver port to the game's routines. The emulator's MCP
server refused connections in this session, so nothing was tried live.
