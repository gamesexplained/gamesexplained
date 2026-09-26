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

## 0.0.26 · 26 September 2026 · Mercenary · air with Claude

**Try what a test ignores.** Mercenary's lift key matches the player's
map square and the spot inside it against a table of eight lift squares,
and never looks at the height. The eighth entry is the lift on the Colony
Craft, 65 squares up; standing on the ground under it, the same key takes
the player into the Colony Craft, a journey every published solution makes
by flying up. And a building hit by a missile is marked destroyed at once,
while its count, its name and the owner's reprisal wait on a 16-pass
countdown whose routine returns early unless the player is in that square:
fired from the next square, the building falls and the game never notices.
Neither shape is a comparison with the wrong sign; both are tests that
leave something out. `60-verify` now names them: for a lookup, list the
coordinates it does not key on; for deferred work, what it requires of the
player later; then try it in the emulator.

**The hand-over has two traps.** A stopping checkpoint on an address that
a ROM covers fires inside the ROM (here BASIC's number conversion, on the
depacker's address), and a second autostart keeps the first boot's RAM
wherever the loader does not write. `10-orient` says to check `$01` at the
stop or stop first on RAM only, to power-cycle before any boot whose memory
will be read, and, for a packed program, to keep the last hand-over.

**Compute the game's figures the game's way.** Mercenary's craft speeds,
worked out in exact arithmetic from the motion records, came within 1 %
of the table Zzap!64 printed, and were written down as consistent. A port
of the flying step in the game's own two-byte logarithmic floats, which
truncate, with the throttle key that refuses its last step, gave the
magazine's figures to the digit, and a hard ceiling for every craft that
the exact version missed. `60-verify` now says so. The ports that
corrected it were tested in a 6502 simulator on the snapshots, and five
widget agents each wrote their own; the kit now has one,
`kit/c64/cpu6502.js`, with a self-test.

## 0.0.25 · 26 September 2026 · The Sentinel · air with Claude

**When another version of the game is documented, map it before reading
any code.** The Commodore 64 Sentinel is its author's BBC Micro program
carried across, and Mark Moxon's reconstruction of the BBC version is
published. Ten-byte windows of the BBC code, kept where each was found
exactly once in the C64 image, placed 10,751 of its 23,534 code bytes;
556 of its 885 labels landed on an instruction; and the offsets fell into
a handful of blocks (most of the program at the same address, whole
blocks at +`$5300`, +`$3D20` and +`$2800`). With that map in the brief,
eight annotation agents took the image to 100 % in an hour, and what did
not map (the screen, the sound, the keyboard, a copy of the BBC's
operating-system entry points) was exactly the C64's own work, the list
worth reading first. The sweep skill now has the method: unique windows,
blocks by offset, labels only where they land on an instruction, and the
other version's words never copied, since its account of the hardware is
never true of this machine.

**A freezer backup is the game as it stood, not as it loaded.** The copy
supplied was a cartridge backup that crashed on resume: the RAM holding
its interrupt vectors had not been saved. Restarting at the game's own
entry, found as the only caller of its machine set-up, made it play,
because the start-up code rebuilds what it needs. A second hole looked
like the emulator's power-up fill and nothing touched it on the way to
play, but a checkpoint on it caught the first pan calling into it: 1.5 KB
of missing code. The platform reference now describes such backups, how
to restart them, and how to tell a spare range from missing code with a
store and an execute checkpoint, and the orientation step asks for that
check on the first view, before the run rests on the image.

## 0.0.22 · 25 September 2026 · Little Computer People, the retrospective's ask · air with Claude

**Under the I/O area, the instruction decides what an address is.** Little
Computer People runs its sound driver in the RAM beneath the chips and
keeps its first label there, `snd_event`, at `$D000`. The disassembler
keeps one label per address, so the raster interrupt's write to sprite 0's
X position read `sta snd_event,y`, and Wizball's sprite shapes at `$D000`
and `$D400` put their names on its video and sound chip writes. The
comments said which meaning was live, and the listing still read wrong.
`listing.py` now names an operand in that range after the chip's register
for code outside it and after the game's symbol for code inside it, and a
register access no longer counts as a reference to the RAM beneath. Code
elsewhere that banks the chips out and touches that RAM is listed in
`game.json` under `io`. Little Computer People has three such stretches:
two between its own writes to `$01`, and a routine called only with the
chips out. The coverage skill says to go through the bank switches and
fill it in.

## 0.0.20 · 24 September 2026 · Wizball, the retrospective's asks · air with Claude Opus 5.5

**Record the frame; do not rebuild a split screen by hand.** Wizball's
rebuilt frame took half an hour of its run: registers read at every
interrupt, and a line renderer written for the one game. Every
split-screen game needs the same. `kit/c64/frame.py capture` now records
one whole frame: every write to the video chip, the video bank and the
sprite pointers, with the line and cycle it happened on. `C64.renderFrame`
in the site's library draws it cycle by cycle, and `compare` checks the
drawing against the emulator's own picture of the same frame. On the
kit's own split-screen test program, and on six frames from five of the
games here, every pixel matched except a handful at mid-line changes of
mode or scroll. The minisite skill now starts there, and the platform reference
has the chip's timing as measured.

**A search for the readers of an address decodes every opcode.** One of
Wizball's agents reported that nothing reads the NMI watchdog byte; three
others found the two checks that do, in undocumented opcodes the
disassembler shows as data. `kit/c64/opcodes.py --refs <address>` lists
every instruction that can touch an address, documented or not, including
an index that carries an absolute address past `$FFFF`. On Wizball's
listing it finds all five instructions that touch `$85` in one pass, and
the verify skill now sends a negative result through it.

**100 % is of what the ledger can see.** The ledger counts what code,
symbols and `game.json` name, and nothing else. Wizball's first 100 %
left out 4 KB of sprites under the I/O area. Run on Little Computer
People's hand-over and play snapshots, the new check in `listing.py`
found 1.6 KB of that game's own tables and its picture's colours outside
its 100 %. `listing.py` now lists such data after every build, and the
coverage skill says to go through the list before calling 100 %.

## 0.0.18 · 24 September 2026 · Wizball · air with Claude Opus 5.5

**Read the gaps in the code before calling a byte unread.** One agent
searched every decoded instruction for a read of the NMI watchdog's byte
and reported that nothing reads it. Three others found the two checks
that do, written in undocumented opcodes the disassembler shows as data,
one of them reaching zero page through an absolute indexed address that
wraps past `$FFFF`. The platform reference now lists the undocumented
opcodes seen in games and the wrap-round, the disassembler's notes say
how they appear, and the verify skill's table of negative results has
the case.

**In VIC bank 3 the RAM under the I/O area belongs to the video chip.**
The first 100 % left out 4 KB: 64 sprite shapes at `$D000`-`$DFFF`, which
the video chip reads in bank 3 while the CPU sees the chips there, and
which the coverage ledger excludes as I/O by default. Nothing refers to
them by address; they turned up only when the page's alien gallery asked
for frames that were not in the listing. The platform reference and the
coverage skill now say to look there whenever `$DD00` selects bank 3.

**Rebuild a split screen interrupt by interrupt.** The play screen
changes the video registers, and sprite 0's pointer, at a dozen raster
lines a frame. Recorded at every interrupt of one frame and drawn line by
line with the state in force, the rebuilt frame matched the emulator's
screenshot in all but 13 of 104,448 pixels; drawn from one read of the
registers, it had shown the beam where the ball should be. The minisite
skill now says how.

**Poke before the reader runs, or use the game's own way in.** A level
number poked on the get-ready screen changed the level's glyphs but not
its map, because the view had already been built: the screen mixed two
levels. The game's continue keys, with only their limit poked, gave a
real level 5. The verify skill says so.

## 0.0.16 · 24 September 2026 · Master of Magic · air with Claude Opus 5.5

**Test the reset as well as RESTORE.** The game writes the `CBM80`
signature so that both restart it, and both did, but after a reset the
title came up in the wrong colours. A reset clears the 6510's data
direction register, the KERNAL jumps through `$8000` before it would set
it again, and the game's restart never does, so its write to `$01` changes
nothing and BASIC stays switched in over the game's tables. Reading `$00`
after the reset settled it in a minute. The platform reference now says
to test the reset path separately and read `$00` and the CPU's view of
the game's data after it.

**List what a test lets through.** The best secret in this game came
from asking which values a compare accepts rather than which it was
written for. The menu's door test is a signed compare, so every
character code below `$70` passes as a door too, and the edge of a pool
is such a code: standing there offers OPEN. The same question found two
weapon bonuses that can never apply, each testing one register against
two values in turn. The verify skill now asks for the accepted values
of every classifying compare, and a search of the data for the
unintended ones.

**A port is tested against the game.** Three mechanics went onto the
page as JavaScript: the line of sight, the creatures' movement and the
music driver. Each was checked before it was published, the creatures
against a pass-by-pass trace of the game's own variables recorded in
the emulator (400 passes, 1.8 million values), the music against the
original driver code run in a 6502 simulator on the snapshot (every
sound register, every frame), and the line of sight against a second
implementation and two screenshots. Then the whole game was ported for
a Play tab, and the game's own demonstration, a recording of input,
tested all of it at once: fed that input poll by poll, the port
reproduced the real demonstration's run for all 2,371 passes of the game
loop, byte for byte. The minisite skill now asks for this kind of test,
and the emulator notes say how to record the trace.

**Rebuild a picture before naming its mode.** The coordinator's brief
called the title screen character mode, from one write to `$D018`; it
is a multicolour bitmap, which two agents proved by drawing it from
memory and matching a screenshot. The platform reference now says how
bitmap mode reads `$D018` and that a raster split can change the mode
per band.

## 0.0.14 · 23 September 2026 · Encounter · air with Claude Fable 5.1 and Claude Opus 5.5

**A brief carries only what has been checked.** Two of the facts in the
brief given to Encounter's six annotation agents were the coordinator's
own unchecked readings, a character set at `$7000` and a CIA timer
interrupt switched on, and both were wrong. Two agents spent their time
disproving them. An agent takes its brief as ground truth, so the
coverage skill now says to brief with what was traced to the code or seen
live, and to label anything else a hypothesis.

## 0.0.11 · 22 September 2026 · Little Computer People · air with Claude Opus 5.5

**A call can be a jump table that never comes back.** Flow tracing
stalled early, because every behaviour in this game is a state machine
switched by one routine: it pulls its return address, takes the n-th
word of the table that follows the call, and jumps there. A hundred and
three such tables, none with a stored length; each runs up to the next
call site. The coverage skill now describes this beside the calls that
eat an argument and return, says how to find where a table ends, and
names the trap that undoes the work: disassembling a call site again
sends the tracer back into its table. The table that picks the behaviour
was first read as 32 entries and had 128; check such a length against
the values the variable takes live.

**Code can live under the I/O chips.** This game banks them out and runs
code and keeps its dispatch tables in the RAM beneath, which the C64
defaults had taken out of the coverage count as I/O. `coverage.include`
gives such a range back, and the skill says how to spot one:
instructions located in the I/O range, and the bank switch around them.

**Run the control from the same snapshot.** The little person does
things whether or not anyone asked. The emulator replays a snapshot
exactly, random choices included, so the same run without the typed
request shows what he would have done anyway, and any difference is the
request's doing. The flip side is that every run from one snapshot makes
the same "random" choice: one snapshot is one sample.

**Record the music, don't model the driver.** Stepping one frame at a
time and reading the SID after each frame recorded twenty seconds of
each of the eight pieces, which checked two music drivers against what
they actually play. Naming the recorded notes showed the tables are
tuned for NTSC, so a PAL machine plays everything about 0.65 of a
semitone flat; the platform reference now says to find a table's clock
before naming its notes.

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
