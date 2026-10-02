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
