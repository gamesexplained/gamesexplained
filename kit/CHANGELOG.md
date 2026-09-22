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

## 0.0.10 · 22 September 2026 · Jupiter Lander · air with Claude Fable 5.1 and Claude Opus 5.5

**"The loop never runs again after a snapshot load" was the instrument,
not the game.** A VICE snapshot carries the CPU's "check the monitor
before each instruction" bit, and loading one saved with no checkpoints
switched every live checkpoint off, silently: hit counts frozen at zero,
stops never taken, until the next checkpoint change. Two runs had read
that as a lost timer interrupt. The rule stands on any build: a negative
result from a counter is a claim about the counter until a control
checkpoint has counted in the same breath.

**Measure the emulator, then read only the workarounds it needs.** The
tool notes had grown into a list of traps, most of them true of one
build and false of the next, and an agent on a better build was still
paying for all of them. `kit/EMULATOR.md`'s four phases are now a
script with a test program of its own (`tools.py check-emulator`, 56
named checks, under a minute, no game needed). The tool skill describes
a working emulator, and the traps moved to `workarounds.md`, one section
per check, read only when that check fails. The orient step runs it
first and records the result.

## 0.0.8 · 22 September 2026 · Jupiter Lander · air with Claude Fable 5.1

**A poke proves the code, an input movie proves the player.** The scoring
section claimed a climbing landing pays more than a perfect stop, on the
strength of a velocity poked at a breakpoint. Asked whether a ship can
actually arrive climbing, the answer from the loop's order of tests was
no on two pads and yes on one, and the perfect stop itself turned out to
be unreachable. The verify skill now separates the two kinds of evidence
and says how to get the second: model the movement routine exactly, search
it for an input sequence, replay the sequence with the game's control read
patched to a table, compare every pass.

**Look for the state the programmer never meant to be reached.** The
minisite and coverage skills now name the shapes it takes in code, exact-match
tests, sign assumptions, eight-bit wraps, test order, and ask for a stepper
the reader can walk through once one is found and flown.

**Do not step a game loop with stopping checkpoints.** Resuming after a
stop did not work through the tool, and alternating two checkpoints ran two
passes per step. The vice-mcp notes carry the control-read patch that
replaces stepping, and the attract-mode trap that made an input look dead.

## 0.0.7 · 20 September 2026 · Encounter · air with Claude Fable 5.1

**A pointer table is the census of a region.** The init of this game
moves 8 KB of shape scripts from `$3E00` down to `$1E00` and then reuses
`$4000-$5FFF` as character buffers. The block at `$1E00` was excluded from
coverage as "a leftover copy" until the shape-pointer tables were resolved
and every entry landed in it. The coverage skill now says: before a
region goes in `exclude`, resolve every table the code uses as addresses
and see where the entries land.

**When a key does nothing, try the other input tool before blaming the
game.** The matrix tool reported SPACE pressed and the game's pause loop
never ran; the host-key tool reached it on the first try. The vice-mcp
notes now carry the case, with the rule that a hit counter on the routine
that should react is the instrument, not the tool's own status report.

**Registers at a stopping checkpoint are not the values the instruction
saw.** The accumulator read 0 at a `cmp` the game had just executed with
$FF. Count hits or read what the routine wrote; do not quote registers.

**Read the register bits in binary before naming a character set.** A
`$D018` value was decoded as "charset at `$7000`" by mental arithmetic, and
an hour of description of a "second character set" followed before a
sub-agent redid the bits. The platform reference now carries a worked
example.

## 0.0.6 · 19 September 2026 · Falcon Patrol · air with Claude Opus 5

**A running interrupt does not prove the game is running.** A stopping
breakpoint opens VICE's monitor, and while the monitor is open the machine
is paused, but nothing says so: the emulator reports "running", screenshots
show the last frame, memory reads return steady plausible values, and every
breakpoint reports zero hits. A whole afternoon went into a confident,
published-then-retracted claim that this game's timer could not survive a
snapshot restore. The cheap test that settles it in one call is now in the
orient skill: **sample the program counter several times.** A live machine
returns a scatter of addresses; a parked one returns the same address
every time.

**Carry a control when you measure with breakpoints.** Later in the same
run the hit counts stopped recording altogether while still reporting the
breakpoint as enabled, which reads exactly like a routine that is never
called. Put a breakpoint on something you know runs, in the same batch as
the one you are measuring. If the control reads zero, the instrument is
dead and no number from that batch means anything. A dead instrument and a
true absence are indistinguishable without it, and only one of them is a
publishable claim.

**Watch which instruction does the forcing.** This game gates the pilot's
controls by rewriting the joystick byte, and two of those gates are one
instruction apart with opposite meanings. `ora #$FE` sets every bit except
the climb, so the player must still push up; `lda #$FD` sets the byte
outright and flies the aircraft into the ground. Read as "forces a climb",
the first one turns twenty minutes of a motionless aircraft into a hunt
for a bug that is not there.

**The cracker's trainers are a variable map.** A trainer is a single-byte
poke, and the cracker had to know what each address held to write it.
Turning `DEC $1D` into `LDA $1D` for unlimited lives identifies `$1D` as
the life counter as firmly as any trace. Where a release carries trainers,
read them first: six of this game's variables were confirmed that way, and
the group's own scroll text, still in memory unread, named which parts of
the image were theirs rather than the original author's.

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
