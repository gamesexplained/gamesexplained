# How the kit has changed

The kit is what an agent is given to reverse engineer a game. Every game
run through it comes back with a list of where the kit was wrong or
silent, and the fixes go in before the next game starts. This page is the
part of that record worth reading: what the kit learned about reverse
engineering, from which game, and who was working it. Newest first.

An entry earns its place by changing what the next contributor's agent
does when it opens a game: how it reads, traces, measures or verifies.
Changes to the site, the folder layout, the delivery process, the prose
style or the install mechanics are in the pull requests, not here.
Versions that taught nothing of the kind do not appear.

## 0.0.4 · 16 September 2026 · Choplifter, a second look · air with Claude Opus 5

**A counter you cannot find is usually another counter.** Choplifter
promises three helicopters and holds no life counter. It counts sorties,
and a sortie ends only when the helicopter is destroyed; the third one is
the end of the game. The verify skill now says to trace the path from the
destruction flag to the next start of play before calling a counter
absent.

**The emulator's joystick tool drives the wrong port.** It passes the
port number straight to an API that counts from zero, so asking for port
1 moves port 2 and asking for port 2 moves nothing. Most C64 games read
port 2, so the bug hides behind "ask for port 1 and it works"; the early
Commodore games here read port 1 and could not be driven at all. The
cause is in the tool notes with the one-line fix, sent upstream; the
kit's scripted client carries a workaround through the CIA's
data-direction register.

## 0.0.3 · 15 September 2026 · Choplifter · air with Claude Opus 5 and nine subagents

Choplifter is a 16 KB cartridge with a double-buffered bitmap and no
sprites, three times the size of either earlier game, and it exposed four
gaps the small games never could.

**Inline parameters.** Five routines take their argument from the bytes
after the `jsr` that calls them, and a flow disassembler walks into the
argument and decodes it as code. Coverage stalled at 9 KB and a scan of
every jump target found nothing new, which reads like "the rest is data".
The coverage skill now describes the idiom and the stack-unwinding shape
to look for; one pass took the tracked image to 16 KB.

**One log per agent.** Nine annotation agents shared one disassembler and
needed separate logs, which the client could not give them. It can now.

**How far a description reaches.** A symbol owns the bytes to the next
boundary, capped at 64 for plain data. A long table needs a named symbol
every 64 bytes or most of it stays unexplained however well the whole was
described. Now stated in the skill.

**Cartridge images, invisible RAM, the emulator's RAM pattern.** A `CBM80`
header at `$8004` means a cartridge dump with a loader bolted on; the
video chip cannot see RAM under the character ROM's shadow, so games keep
tables there; unwritten RAM in the emulator has a repeating pattern that
is not data.

**The last symbol.** The ledger gave the last symbol in an image a span
of one byte, so a fifteen-byte table at the end of Radar Rat Race was one
byte tracked. Found while building the memory maps; fixed.

## 0.0.2 · 14 September 2026 · Jupiter Lander · air with Claude Opus 5

The first game run through the kit by an agent that had only the kit.
Silver at 100 % in 93 minutes, and a page of corrections, most of them
places where a skill had described a tool from memory instead of from
the tool.

**No scripted emulator client.** Live verification is a loop of halt,
poke, run, read, and doing it through one tool call at a time is slow and
lets the machine run between steps. `vice.py` was written during the run.

**Measuring without fooling yourself.** Poke a variable and read a derived
value, and a whole game update may have run in between; numbers that are
consistently one step out are this, not a misreading of the code. The
verify skill has a section on it.

**Snapshots.** Save them without ROMs, look at the frame you save (the
first "steady state" was an explosion), and stop the machine the moment a
snapshot loads.

**Statuses.** A feature can be clear in the code and impossible to
exercise with the tools at hand; "traced" is now a status, distinct from
"confirmed" and "live".

## 0.0.1 · 13 September 2026 · Radar Rat Race · air with Claude Opus 4.1 and Fable 5.1

The kit was written from the first game, which was analysed before any of
it existed. The rules (prefer unknown to a guess; a negative result is a
claim about your search; verify before publishing; correct in place), the
skills (orient, features, text, sweep, coverage, verify, article, retro),
the C64 reference, the coverage metric and the symbol map are its
retrospective.
