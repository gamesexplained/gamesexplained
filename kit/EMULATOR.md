# What an emulator has to bring

The kit does not need an emulator. It needs four different things from
one, and they are different enough that a machine's emulator can be good
at one and useless at another without anyone noticing until a run has
lost a day to it. This file names the four, says what each needs in
capabilities and in time, and gives a test for each that a candidate
emulator passes or fails in an afternoon, before a game is opened.

A platform's `kit/<platform>/INSTALL.md` states, per phase, what the
recommended emulator passes, what it fails, and the workaround for each
failure. `kit/PLATFORMS.md` puts that in the order of work. The
Commodore 64 notes are the worked example.

## The two transports, and the budget

An agent reaches an emulator two ways, and the phases below care which:

- **Tool calls**, one per action, each a round trip through the agent.
  Seconds each, because the agent thinks between them. Fine for a
  dozen actions. Wrong for a loop.
- **A scripting client**, `kit/<platform>/<emulator>.py`, that a script
  imports to make the same calls without the agent in between.
  Milliseconds each, bounded by the emulator's own transport.

Every phase after the first is a loop, so the scripting client is the
real interface and the tool calls are the way the agent drives it by
hand. An emulator whose only interface is interactive, a debugger window
with no socket or script hook, fails every phase but the first and is
not a candidate.

The budget that matters is one frame of the emulated machine, about
20 ms for most 8-bit systems. A capability that cannot act within a frame
of when it was asked is not a real-time capability, whatever it is called.

One more thing the transport owes the script: **a call answers whatever
the machine is doing.** Running, stopped, or stopping in the middle of
the call; a request that fails because a checkpoint hit while it was in
flight is indistinguishable, to the script, from a dead emulator, and
the script will go looking for the wrong fault.

## Phase 1: static inspection

Paging through memory to decode a table, reading the disassembly of a
routine, dumping a chip's registers, looking at a rendered sprite or
tile. No timing requirement at all: the machine can be running, paused,
or not there.

Needs:

- Read any range of memory, in one call, of any size. Reads must honour
  the machine's banking, with a way to name the bank, so RAM under ROM or
  I/O is reachable.
- Read the CPU registers and the state of each chip by name.
- A **snapshot format the kit can parse from Python**, with the RAM image
  at a documented place. This is the one that matters most and is the one
  most often skipped. With it, most of this phase needs no emulator at
  all: the listing, the symbol map and every table decode read the
  snapshot file in `work/` at zero round trips. `kit/scripts/listing.py`
  is built on this. A format that is undocumented, compressed without a
  spec, or that only the emulator can read, means every read is a round
  trip for the rest of the run.

Test: save a snapshot; read the same 256 bytes through the tool and out
of the file with a Python one-liner; they match.

## Phase 2: state management

Getting the game to a known state and coming back to it: past the
loader, past the title, into level three with two lives, and then there
again after a wrong poke, and again tomorrow. This is where the hours
go in a run, so a failure here is the expensive one.

Needs:

- **Save a snapshot** of the whole machine, from a running game, on
  request, to a file the kit controls the name and location of.
- **Load it back** and have the game continue exactly as it would have.
  "Exactly" includes the timers and interrupts, the bank configuration,
  the disk or tape state if the game will touch it again, and the input
  devices. An emulator that restores RAM and the CPU and not the timer
  chips returns a machine that sits in its tick-wait loop forever, and
  the symptom is indistinguishable from a game that has crashed.
- **Load paused**, or a way to stop the machine in the same call, so the
  state loaded is the state inspected. A loaded snapshot that starts
  running at once has already moved on by the time the next call lands.
  A load on a stopped machine that leaves it stopped, at the loaded
  state's program counter, is this.
- **Checkpoints survive a load.** The breakpoints and watchpoints are the
  agent's, not the machine's, and a load must not touch them, or their
  arming. An emulator that stores "there are checkpoints to check" as
  CPU state, and restores it from the file, switches every live
  checkpoint off when a snapshot saved without any is loaded, and nothing
  reports it: counts stay at zero, stops are never taken, and the
  symptom reads as "the loop never runs after a load".
- **Warp**, to get through loading, and a way to turn it off again that
  actually works.
- **Determinism**: the same snapshot plus the same inputs gives the same
  run. Without it the input replay in phase 4 is meaningless.

Test: play into the game; put a non-stopping checkpoint on the game
loop; save; load; the checkpoint counts on (that is the running test,
and the survival test in one). Then arm a stopping checkpoint on the
loop with an ignore count of a hundred, load again, and when it stops
compare the zero page, the screen and the video chip's registers with
the same stop after a third load: identical, byte for byte. Do this with
a snapshot saved from a running machine and one saved from a stopped
one. Then quit the emulator, start it again, load, and compare once
more. Wall-clock comparisons ("ten seconds later the screen matches")
are not this test: a sample a few milliseconds late is a pass late, and
the machine looks nondeterministic when the script is.

## Phase 3: live measurement

Counting how often a routine runs, which routine writes a variable, how
many cycles a handler takes, whether a key is ever seen, all while the
game runs at its own speed. This is most of the verification step, and
it needs the machine **not** to stop.

Needs:

- **Non-stopping checkpoints** on execution, load and store, with hit
  counts the agent can read without disturbing the run. The hit count is
  the measurement; the stop is a side effect this phase does not want.
- A way to **prove the machine is running** in one call, because every
  measurement here is worthless on a machine that has silently paused.
  A hit count that grows on a routine known to run is the test; two
  reads of the program counter are not, because a game that idles in a
  two-instruction delay loop returns the same address twice while
  running.
- **Truthful state.** The call that reports "running" or "paused" says
  what the CPU is doing now, not what a flag was set to: a "paused" that
  is honoured at the next vertical sync is a frame of lies, and a
  "paused" from an unset flag at boot is worse.
- A cycle counter or stopwatch, validated once against a known quantity
  before it is believed.
- Chip state that can be read without pausing, with the understanding
  that registers a raster handler rewrites will read as whichever value
  was last written.

Test: put a checkpoint on the interrupt handler and one on a routine
that never runs; after a second, the first count is about fifty times
the frame rate in seconds and the second is zero. If both are zero the
instrument is dead, and the platform notes must say how to tell.

## Phase 4: frame stepping with inputs

Tool-assisted-speedrun style. Set the joystick or a key, advance exactly
one frame, read the variables that changed, decide, repeat. This is how
a corner case is reached that a player could reach, how an input path is
proved rather than assumed, and how a model of the game loop is checked
against the game one pass at a time. It is also the phase almost no
emulator interface gets right, because it needs a stop that is exact.

Needs:

- **An exact stop.** When a checkpoint hits or a step completes, the
  machine halts on that instruction, not at the end of the frame. A stop
  that is deferred to the next vertical sync runs up to a frame more, and
  every symptom of that looks like something else: the program counter
  is not where the break was, the registers belong to a later
  instruction, two checkpoints alternated to step one pass run two.
- **Advance N frames** from a stopped machine, and stop again exactly at
  the frame boundary. One call, not N.
- **Input that persists through a stop, and lands at once.** A joystick
  direction set while paused is in the port register before the call
  returns, seen by the next instruction, still held when the machine
  advances, and released when the script says, not after a fixed hold
  the tool chose. The same for keys. Emulators imitate a human hand by
  delaying host input a random amount up to a frame; for a script that
  sets an input and steps, that is an input seen a pass late half the
  time, and no replay is repeatable. Input must be delivered on the port
  the game actually reads, so a machine with more than one port needs
  the port number to mean what the hardware manual says.
- **A step that returns when it is done.** Single-stepping from a stop
  is one call, and the reply carries the program counter, so the next
  read is of the machine after the step and not of a step still armed.
- **Read between frames**, in the same script, at a cost small enough
  that the loop runs at tens of steps a second. A step that costs a
  second of agent time is not this phase; it is phase 3 done badly.
- A snapshot save and load fast enough to use inside the loop, for
  rollback: try an input, read the outcome, load, try another.

Where an emulator cannot do this, the fallback is inside the game: hook
the game's own input read to take each pass's input from a table in free
memory and log the state variables it produces, then let the game run at
full speed and read the log. It costs about fifty bytes of machine code
per game and is faster than any external stepper, but it needs the
input routine found first, which is a phase 1 result. The platform notes
should say which of the two the recommended emulator supports.

Test: stop at the top of the game loop; set the stick left; read the
port register, it shows it already; advance one frame; read the player's
x coordinate; it has moved one step left and the loop checkpoint has hit
exactly once. Repeat ten times in a script and time it. A game that
paces itself with a delay loop rather than the frame runs a pass in some
other time than a frame; there the unit is the pass, and the test is the
stopping checkpoint on the loop top with run-and-wait, once per pass,
exactly once, ten times. Then send a hundred calls with no pacing while
a stopping checkpoint is armed: none may fail, and the machine must be
where the checkpoint says afterwards.

## What the platform notes record

A table, one row per phase, three columns: what the recommended emulator
passes, what it fails, and the workaround. A failure with a known
workaround is fine and is what the skill for that tool is for. A failure
with no workaround in phase 2 or 4 is the strongest reason to look at a
different emulator, or at fixing the one you have upstream, before the
first game rather than after the third. The requirements here are the
same for a Spectrum, an Amiga or a NES as for a Commodore 64; only the
chip names change.

Keep the tests as a script, and give it a test program of its own, a
few dozen bytes written into memory and started, rather than a game: it
then runs on any machine with no image to hand, and every value it
checks is known in advance. Give each check a short name. The tool skill
keeps its workarounds in a separate file, one section per failed check,
so an agent on a build that passes reads none of them, and a section is
deleted when the release passes its check. Run the script through the
launcher (`tools.py check-emulator`) after every install, rebuild and
release; a table typed from memory of the last run is not a measurement.
The Commodore 64's is `kit/c64/check_emulator.py`.
