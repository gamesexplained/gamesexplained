# Kit feedback from Falcon Patrol (c64)

Working notes for `80-retro`. Each item says what went wrong, and the diff
that would have saved the next contributor the trouble. Items marked
**done** have been made in this branch.

## The workflow does not say to keep going

The contributor chose a tier at the start of the run — Gold — and the
agent still stopped at a clean commit boundary to report progress and
offer to scale down to Silver. That is a waste of the contributor's
attention: they had already answered the question, and being asked again
mid-run is worse than useless, because it invites second-guessing a
decision that was already made.

Nothing in `kit/START.md` or `AGENTS.md` tells the agent that the chosen
tier is a commitment to work to, rather than a preference to revisit.

**Diff:** `kit/START.md` should ask for the target tier as a fourth thing
in step 3, alongside which game and where the image is. `AGENTS.md`, under
"Definition of done", should say plainly that once a tier is chosen the
agent works to it without stopping to ask whether to continue, and that
the only good reasons to stop early are a genuine block, a decision only
the contributor can make (a download, a login), or the contributor saying
stop.

## Nothing sets expectations about how long this takes

A contributor choosing between Bronze and Platinum has no idea whether
they are asking for ten minutes or a day, and neither does the agent. This
run reached about 12 % coverage after roughly an hour of wall-clock work,
most of which went on orientation, tooling and the live-test dead ends
below — not on annotation. Gold, at 100 % of 12,458 tracked bytes, is a
different order of task from Bronze.

**Diff:** put a rough order-of-magnitude per tier in the "Definition of
done" table, said as ranges and hedged honestly, so the contributor
chooses knowing what they are asking for and the agent knows when it is
badly off track. Something like: Bronze under an hour; Silver a few hours;
Gold the better part of a day; Platinum longer still and mostly the
assembler. Say that the annotation burn-down dominates everything above
Bronze, and that it parallelises across subagents while orientation does
not.

## Nothing tells the contributor to stop their machine sleeping

A Gold or Platinum run is hours of mostly unattended work, and the whole
of it happens on the contributor's own computer: the emulator, the
disassembler and the agent's shell all die or stall when the machine
suspends. A contributor who starts a long run and walks away can come back
to a session that stopped twenty minutes in, with the emulator gone and
the disassembler's unsaved state with it. Nothing in `kit/INSTALL.md`
mentions it.

This belongs with the tooling notes rather than the workflow, because the
command is per operating system and only macOS is verified.

**Diff:** a short section in `kit/INSTALL.md`, next to "Start, check,
stop", saying that anything above Bronze should be run with sleep
inhibited, and giving the macOS command, which needs no install and no
privileges:

```
caffeinate -dimsu -w $$      # keeps the machine awake while this shell lives
```

or, to cover a whole session from outside it, run the agent under
`caffeinate -dims <command>`. The flags are display, idle, disk, system
and "keep awake even on battery"; `-w $$` ties it to the shell's lifetime
so nothing is left inhibited afterwards, which matters because a stray
`caffeinate` is exactly the kind of thing the footprint principle exists
to prevent. Note that it does not survive a lid close on battery.

Linux (`systemd-inhibit --what=idle:sleep:handle-lid-switch <command>`)
and Windows (`powercfg /requestsoverride`, or the `presentationsettings`
tool) have equivalents, both **untested** by us; whoever runs the kit
there first should verify one and record it, the same way the rest of
`INSTALL.md` treats untested platforms.

## `coverage.py --live` was broken — **done**

`load()` called `from_live()` with no argument, but `from_live(plat)` takes
the platform. Every `--live` invocation died with a `TypeError`, so the
burn-down loop in `50-coverage` step 1 could not be run as written. Fixed
in this branch by passing `game.get("platform", "c64")`, the same way
`symbols_export.py` does at its own call site.

## `stick_arm` silently breaks the keyboard, and the skill does not say so

`kit/skills/c64/tool-vice-mcp` explains the `$DC03`/`$DC01` workaround for
driving control port 1, and says to undo it with `stick_release` "before
handing the machine back". What it does not say is that while the stick is
armed, **keyboard matrix columns 0 to 4 stop working entirely**, because
those bits are outputs. The symptom is a menu key that simply does not
register, with every tool reporting success.

It cost real time here: the trainer menu's `H` (row 3, **column 5**) kept
working, while `R` (row 2, **column 1**) did not, which looks like a
flaky emulator rather than a mask. The mask `$1F` in `stick_arm` is
exactly why: it leaves columns 5 to 7 alone.

**Diff:** add to the joystick section of `kit/skills/c64/tool-vice-mcp`: a
sentence saying that an armed stick makes keyboard columns 0-4 dead, that
keys in columns 5-7 keep working and will mislead you, and that
`stick_release` must come before every keyboard press, not just at the
end. Worth a line in `kit/c64/vice.py`'s `stick_arm` docstring too.

## An open monitor pauses VICE, and nothing in the kit says so

This was the single most expensive thing in the run, and it produced a
confidently wrong entry in `facts.md` that had to be retracted.

A checkpoint with `stop` set — which `kit/c64/vice.py`'s `halt_at` uses,
and which `tool-vice-mcp` rightly recommends as the only reliable way to
stop the CPU — opens VICE's **monitor**. While the monitor is open the
emulation is paused, and it stays paused after the checkpoint is deleted.
`vice_execution_run` does not bring it back. Neither does
`vice_machine_reset`, nor `vice_autostart`: both appear to succeed and
change nothing.

What that looks like from the agent's side is not "paused". It looks like
a game that has broken:

- `vice_ping` reports `"execution": "running"`.
- The screen keeps showing a plausible, frozen frame, so screenshots look
  like gameplay.
- Every checkpoint reports `hit_count: 0`, which reads as "that routine is
  never called".
- Memory reads return consistent, plausible, unchanging values.

On that evidence I concluded that this game's CIA2 timer does not survive
a snapshot restore, wrote it into `facts.md` as a live finding, and
restarted the emulator process to work around it. All of it was wrong. The
contributor watching the GUI said the monitor window was open; closing it
resumes emulation, and re-testing with no stopping checkpoint anywhere
showed snapshots restore perfectly.

**Diff, in three places:**

1. `kit/skills/c64/tool-vice-mcp`, under the behaviours that waste time:
   a stopping checkpoint opens the monitor and **pauses the machine until
   the monitor is closed**. Say that `vice_ping` still says "running",
   that screenshots still show the last frame, and that every hit count
   will be zero — so a paused machine is easy to mistake for a game that
   has stopped calling its own code. Say how to get out of it: close the
   monitor window (the contributor can do it in the GUI), or avoid
   stopping checkpoints entirely and use `stop: false` plus hit counts.
2. The same file already says "prove the machine is stopped before you
   poke it". It needs the converse, and it is the more dangerous
   direction: **prove the machine is running before you believe a
   negative result.**
3. `10-orient`, under "Snapshot facts that bite", should carry the
   one-call test that settles it: **sample the program counter several
   times.** A live machine returns a scatter of addresses; a paused or
   parked one returns the same address every time. It costs one call and
   it would have saved hours here. The existing warning that a restored
   snapshot may come back without its timer interrupt should stay, but it
   should say to run this check before believing it, because the two
   failures look identical and only one of them is the game's fault.

## Checkpoint hit counts stopped recording, silently

Related to the monitor problem above but worth its own line, because it
bit a second time after the monitor was understood. Part way through the
session `vice_checkpoint_add` kept returning `{"status":"ok"}` and
`vice_checkpoint_list` kept showing the checkpoint enabled, while every
`hit_count` stayed at zero — including one on the raster interrupt, which
the program counter was simultaneously caught *inside*. On that evidence I
concluded the game's main loop was not running. It was.

`50-coverage` and `60-verify` both lean on hit counts, and `tool-vice-mcp`
recommends them ("`vice_checkpoint_list` shows hit counts, which is often
the fact you wanted"). They are the right instrument and they do work —
until they don't, and the failure is silent and indistinguishable from a
true zero.

**Diff:** `60-verify` already says to validate an instrument against a
quantity you can compute independently. It should name this case, because
the control is free and obvious once stated: **put a checkpoint on a
routine you know runs — the interrupt handler — in the same batch as the
one you are measuring.** If the control reads zero, the instrument is
dead and no other number in that batch means anything. Say the same in
`tool-vice-mcp` beside the hit-count advice.

## The game's own alphabet defeats the screen-scraping the skills imply

`30-text` is right that a custom character set needs rendering rather than
grepping, and it worked. But several other places in the workflow assume
you can find text on screen — waiting for a menu, detecting a state — and
with this game's alphabet (letters at screen code + `$80`) every such
search silently returns nothing. An agent that writes a `wait_for_text`
helper against screen codes will conclude the title screen never appeared.

**Diff:** a line in `30-text` saying that once the alphabet is known, any
screen-polling helper must be written against it, and that a state
detector which "never fires" is more likely to be using the wrong encoding
than looking at the wrong screen.

## Smaller things

- macOS has no `timeout`, which `kit/INSTALL.md` already says. It is worth
  repeating in `50-coverage`, where the temptation to wrap a long live
  probe is strongest.
- `vice_watch_add` ignores a `load: true` argument and creates a **write**
  watchpoint regardless; its own schema wants `type: "read"|"write"|"both"`
  instead. `vice_checkpoint_add` with `load: true, exec: false` does work.
  Worth a line in `tool-vice-mcp` under the behaviours that waste time,
  since a silently-wrong watchpoint reports zero hits and looks like proof
  of absence.
- `r2000_batch_execute` entries take `name`, not `tool`; the skill's table
  does not show an example of a batch entry and the obvious guess fails
  with "Missing 'name' in call".
