# Arkanoid — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what took longest,
operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/10-orient`: "Save the hand-over too": the stop on `$9400` gave the image the whole run is read from; the start-up erases itself, so the play snapshot lacks it.
- `kit/skills/core/50-coverage`: "Calls whose target is written at run time": the drum player's two self-modified `JSR $DDDD` were traced to their tables, and every target seeded.
- `kit/skills/core/70-minisite`: "Port the routine, then test the port against the game itself": the page's sound driver, run against the simulator's recording of every tune, failed on the ending tune, which showed that the listing left out two bytes of code.
- `kit/skills/core/20-features`: "Its result summaries quote the pages: use them for plain claims only": every page fetch was refused, and the search summaries gave the credits and the capsule list, marked second-hand.
- `kit/skills/core/60-verify`: "Prove reachability with inputs, not pokes": the capsule rows and the enemy rows were left at "traced" until a capsule and an enemy were seen in play, and the capsule's letter read off a zoomed screenshot.

## What was changed in the kit

- `kit/lessons/2026-10-06-arkanoid.md`: the lesson below, seeding the disassembler from the simulator's executed map. No other game folder was found with the same miss, so the skill edit waits under "Candidates" (`kit/skills/core/80-retro`, step 3).

## Candidates

**Code only the running game reaches.** The start-up hides behind
undocumented `NOP`s, and the flow trace stopped in its first three
instructions. Running the game from the hand-over in the kit's 6502
simulator with an `executed` map (`kit/c64/cpu6502.js`'s header says
how), through the title, every menu choice, the attract mode and a game
with random input, gave 765 instruction starts the trace had not
reached; seeding the disassembler with them mapped the code before any
agent read it. Where the simulator stalled, the chip it waited on was
one it does not model, and a hook stood in for the wait. A skill line
would go in `kit/skills/core/50-coverage`, beside "When the disassembler
does not follow control flow": with a flow-tracing disassembler too, run
the game in the simulator and seed from what it executed before
splitting the image.

**An XOR at start-up taken for a decryption.** The start-up XORs 97 bytes
at `$BA0A` with a key, and the first `facts.md` said it decrypted them.
Disassembling the hand-over showed plain code there and noise in play: the
XOR scrambles a second protection check that nothing calls. Caught by an
annotation agent comparing the hand-over with the play snapshot. A skill
line would say: before calling an XOR loop a decryption, disassemble the
block in both images and say which one holds code.

**Bytes inside code that the listing leaves out.** Two `BIT $xxxx` skip
tricks in the sound driver (`$2833`, `$2A27`) and the protection's two
undocumented `NOP`s were untyped bytes between code blocks. Coverage read
100 %, but the listing had gaps there, and a page that runs code from
`listing.json` read zeros. Caught only because the page's driver was
tested against the simulator. See the maintainer ask below.

## Maintainer asks

This session runs on the contributor's fork and cannot reach the
repository's issues, so the asks are written in full for the repository
to file on merge.

- **Have listing.py or check_listing.py flag untyped bytes between code blocks.** Arkanoid's listing reached 100 % coverage with gaps at `$2833`, `$2A27`, `$5F44` and `$5F4E`: the opcode byte of a `BIT` skip trick and two undocumented `NOP`s, left untyped by the disassembler. `listing.json` then carried no bytes there, and the page's 6502 interpreter, which reads its code from the listing, stopped on a zero opcode. A warning in `listing.py` for any gap of under 16 bytes between two code blocks would have caught it at the first build, in `kit/scripts/listing.py` where it already lists untracked data.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 11 | claude-opus-5-5 | 1 |  |
| 20-features | 0 | claude-opus-5-5 | 1 |  |
| 30-text | 0 | claude-opus-5-5 | 1 |  |
| 40-sweep | 8 | claude-opus-5-5 | 1 |  |
| 50-coverage | 1380 | claude-opus-5-5 | 1 | includes two waits for the usage limit to reset (about 18 h and 4.5 h); agents worked about 45 min in all. 9 agents then 5, resumed after each limit; the simulator's executed-address map seeded the code; 100 % |
| 60-verify | 4 | claude-opus-5-5 | 1 | lives cheat, extra life, rounds and Doh by poke, capsules and enemies observed; capsule letter by zoomed screenshot |
| 70-minisite | 10 | claude-opus-5-5 | 1 | capsule chooser port (40,000 cases), driver run in the page (8 tunes, every write), round renderer (round 1 screen codes), frame; single agent |
| 80-retro | 1 | claude-opus-5-5 | 1 | kit edit (50-coverage), lesson, game.json, feedback, TODO |
| total | 1416 | claude-opus-5-5 | | 23.6 h of work |

The 50-coverage figure includes about 22 hours of waiting for the usage
limit to reset; the work itself was about 45 minutes of agents and 20
minutes of merging.

The one change to the kit that would have saved the most minutes: annotate
with a single agent from the start, as `kit/skills/core/50-coverage`
("Splitting the work across subagents") makes the default, which would
have stayed under the usage limit and avoided both waits.

## Operating system and tools

Ubuntu 24.04 cloud container, four cores, no display; VICE v3.13.2 release
zip (57 of 57 checks); it needed six runtime libraries from the list in
`kit/c64/INSTALL.md`, installed with apt. regenerator2000 0.9.20; node
22.22.0; Python 3.11.15. The container restarted twice during the run and
both tools had to be started again and the disassembler rebuilt from the
annotation logs with `r2000.py --replay`, which restored it exactly.
