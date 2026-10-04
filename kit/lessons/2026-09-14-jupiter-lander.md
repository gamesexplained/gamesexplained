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
