# Mercenary — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Changed in this branch

**The listing split word tables (`kit/scripts/listing.py`).** An `Address`
or `Word` item ended at any label. Code that reads a word table's high
bytes as `table+1,Y` mints a symbol on the first entry's second byte, so
the Source tab showed every later entry shifted by one byte: Mercenary's
script table read `$3C08`, `$040A` … instead of `$086C`, `$0A3C` ….
`pair_end()` now keeps the two bytes of a pair together when the label sits
on the pair's second byte (parity counted from the block's start); the
label is shown as a note inside the item, as labels inside instructions
already were. One of the annotation agents found it.

**`check-emulator` left the machine paused (`kit/c64/check_emulator.py`).**
The first autostart after it loaded the game and then sat, until a
`vice_execution_run`. The script now resumes the machine at the end.

**Stopping the emulator alone (`kit/c64/INSTALL.md`, `kit/INSTALL.md`,
`kit/skills/core/50-coverage`).** Both install notes showed only the bare
`tools.py stop`, which stops the disassembler too. Restarting the emulator
that way in the middle of coverage stopped the disassembler twelve agents
were writing to; the session was rebuilt from their logs (each replayed to
its length at the stop, then the rest), about ten minutes lost. The notes
now show `stop vice`, and the coverage skill says to use it while agents
write.

**The hand-over (`kit/skills/core/10-orient`).** Two traps cost a snapshot
each: a stopping checkpoint on `$B98B`, the depacker's address, fired
inside BASIC's ROM during the `SYS` line's number conversion (`$01` =
`$37`), and a second autostart kept the first boot's RAM wherever the
loader did not write, so the "clean" hand-over held leftovers under the
KERNAL. The skill now says to check `$01` at the stop or stop first on
RAM only, to power-cycle before a boot whose memory will be read, and,
for a packed program with several hand-overs, to keep the last.

**The research (`kit/skills/core/20-features`).** The game's main fan
site serves plain HTTP; the fetch tool upgraded it to HTTPS and the
research agent reported it unreachable. `curl http://` through the proxy
read it. The skill now says so, and to check what a research agent could
not reach.

**Starting (`kit/START.md`).** The contributor forbids deleting branches,
and the identity check creates and deletes one; the same check works on a
detached HEAD with nothing to delete. In a hosted session the image is not
on the machine: the contributor uploads it into the conversation.

**Coverage (`kit/skills/core/50-coverage`).** The listing here is built
from the hand-over (the start-up code exists nowhere else), so its check
for uncounted loaded data needs the play snapshot as `--entry`. Renaming
an auto symbol keeps its type and its 64-byte reach, so a renamed table
base still left a table's tail uncounted: a fresh label on the tail
worked.

**Verifying (`kit/skills/core/60-verify`).** Two shapes of "what a test
lets through" that gave this game its best findings: a lookup keyed on
fewer coordinates than the place it stands for (the lift table has no
height), and deferred work behind a condition (a building's count, name
and reprisal wait on a countdown that only runs its course with the
player in the square). `kit/CHANGELOG.md` 0.0.26, `kit/VERSION`.

**The emulator (`kit/skills/c64/tool-vice-mcp`).** Switching the video
standard to NTSC and back left every earlier snapshot refusing to load
("Failed to load snapshot"; the log says the video chip model differs).
Restarting the emulator cured it; the note says to run an NTSC test last.

**A 6502 simulator in the kit (`kit/c64/cpu6502.js`, `kit/c64/test_cpu6502.js`,
`kit/skills/core/70-minisite`).** The skill asks for ports to be tested
against the original code in a 6502 simulator, and the kit had none: five
agents on this run each wrote one. The best-tested of them is now in the
kit with its 49-case self-test (documented opcodes, NMOS decimal mode,
`JMP ($xxFF)`, `loadSnapshot` for a VICE snapshot, `call`). The skill
also warns that a linear congruential generator written with `*` in
JavaScript loses its low bits in the doubles: three agents' random tests
used one, and were rerun with `Math.imul`.

**Exact arithmetic is not the game's (`kit/skills/core/60-verify`).** The
craft's top speeds, computed exactly, came within 1 % of Zzap!64's table
and were written down as consistent; the port in the game's truncating
floats gave the table to the digit, and a hard ceiling the exact version
missed. The skill now says to compute the game's figures the game's way
before calling a gap small. Added to `kit/CHANGELOG.md` 0.0.26.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 16 | claude-opus-5-5 | 1 | tools installed first (release zip, 56 of 56); a one-file packed build: Compacker V2.0, a run-length stage at $B98B and a copy at $5000 traced to the hand-over; a power cycle for clean RAM; a false stop in BASIC's ROM at $B98B |
| 20-features | 3 | claude-opus-5-5 | 2 | a research agent read 20 sources (manuals, Zzap 11 and 13, the fan site's mirrors) while I traced; the fan site read directly afterwards; the game's own 51 scripts decoded for the text rows |
| 30-text | 10 | claude-opus-5-5 | 1 |  |
| 40-sweep | 4 | claude-opus-5-5 | 1 |  |
| 50-coverage | 54 | claude-opus-5-5 | 1 | twelve annotation agents on disjoint ranges, all claude-opus-5-5, plus the lead: 50.7 KB tracked to 100 %. The disassembler was stopped once by tools.py stop (bare) mid-run and rebuilt from the agents' logs (about 10 minutes lost) |
| 60-verify | 18 | claude-opus-5-5 | 1 | facts.md rewritten from twelve agent reports (three disagreements settled from the code: script 10's reward, the canned messages printed, the SID census); nine live tests. The shot into the next square took a second try (a missile fired from the ground sinks before it arrives) |
| 70-minisite | 83 | claude-opus-5-5 | 1 | five widget agents (all claude-opus-5-5) built and tested the city, the underground, the floats and lines, Benson and the scripts, and the flight model, in parallel with the lead's sections; the copy pass and the browser check of both pages by the lead |
| 80-retro | 2 | claude-opus-5-5 | 1 | kit edits (the simulator into kit/c64, the minisite and verify lessons), kit-feedback, five kit-ask issues (three filed, two commented) |
| total | 192 | claude-opus-5-5 | | 3.2 h of work, over 3.3 h |

Portable figures: 16.4 minutes to play, 1.1 minutes per KB (53.8 minutes
for 50,703 tracked bytes), 3.2 hours. Most of the retrospective's kit
edits were made in 70-minisite while the widget agents worked, so its
2 minutes are the filing and this file.

The single change that would have saved the most minutes is a 6502
simulator in the kit: five widget agents each wrote their own before
testing their ports, perhaps twenty minutes apiece, in parallel but on
the critical path of every widget. `kit/c64/cpu6502.js` is that change.

## Operating system and tools

A hosted Linux container (Ubuntu 24.04, x86_64, four cores, no display).
VICE 3.10 through vice-mcp's v3.13.1 Linux release zip, with the fourteen
runtime libraries `kit/c64/INSTALL.md` lists, passed all 56 checks, so no
workaround applied. regenerator2000 0.9.20. The widget tests ran on node
22.22.2 with a 6502 simulator written for them; the pages were checked
with Playwright's Chromium from `/opt/pw-browsers`. `tools.py verify-footprint` was clean on this machine: nothing written outside the repository.

## Maintainer asks

Filed as `kit-ask` issues on 26 September 2026, after searching the open
and closed ones:

- #44: say whether the model id goes in committed files when a hosted
  session forbids model identifiers (the kit's rule was followed here).
- #45: `tools.py stop` should refuse to stop the disassembler while it
  holds changes newer than the last export.
- #46: give a renamed auto symbol the reach of a user label in the ledger.

Two asks already filed by another run got this run's case as a comment:

- #41: the emulator's picture one raster line lower than the recorded
  frame. Here a ground frame differed by 9,001 pixels, 122 at one line's
  offset, while the descent frame matched exactly.
- #42: a shared 6502 simulator in `kit/c64`. This branch adds one, and the
  comment says what of the ask it covers and what it does not.
