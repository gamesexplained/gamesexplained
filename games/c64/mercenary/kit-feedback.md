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
player in the square). `kit/CHANGELOG.md` 0.0.25, `kit/VERSION`.

**The emulator (`kit/skills/c64/tool-vice-mcp`).** Switching the video
standard to NTSC and back left every earlier snapshot refusing to load
("Failed to load snapshot"; the log says the video chip model differs).
Restarting the emulator cured it; the note says to run an NTSC test last.

## What took longest

The clock report goes here when the last step stops.

## Operating system and tools

A hosted Linux container (Ubuntu 24.04, x86_64, four cores, no display).
VICE 3.10 through vice-mcp's v3.13.1 Linux release zip, with the fourteen
runtime libraries `kit/c64/INSTALL.md` lists, passed all 56 checks, so no
workaround applied. regenerator2000 0.9.20. The widget tests ran on node
22.22.2 with a 6502 simulator written for them; the pages were checked
with Playwright's Chromium from `/opt/pw-browsers`.

## Maintainer asks

Filed as `kit-ask` issues at the end of the run and listed here.
