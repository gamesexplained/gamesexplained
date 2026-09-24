# Tools

The kit needs three things: an emulator with an agent interface, a
disassembler with an agent interface, and Python 3.9 or later to run
`kit/scripts/` (no packages required). Which emulator and disassembler
depends on the machine the game runs on, so the tools themselves, how to
get them, and what is known to work on each operating system are in the
platform's own notes:

| Platform | Notes |
|---|---|
| Commodore 64 | `kit/c64/INSTALL.md` |

What "an emulator with an agent interface" has to be able to do, phase
by phase, and the test for each, is `kit/EMULATOR.md`. Read it before
choosing or recommending one.

Python 3 is the one prerequisite the kit never installs. A platform's
notes may name another; if the contributor lacks it, tell them and let
them decide.

This file holds what is true for every platform: the footprint principle,
where things go, and how the tools are started.

## The footprint principle

**The kit leaves the cleanest footprint we can reasonably manage, so that a
contributor can trust it with their computer.** In practice:

1. Everything installed lives inside this repository, under `tools/`.
2. Everything the tools write while running (settings, logs, snapshots,
   caches) lives there too, by pointing each tool's paths inside.
3. Uninstalling is deleting the folder. Whatever cannot be contained is
   listed, completely, in the platform's notes under "Uninstall", and the
   contributor is told before anything is installed.
4. It is verified, not assumed: `python3 kit/scripts/tools.py verify-footprint`
   runs a whole launch, use and exit and lists anything written outside the
   repository. An empty list is the pass.
5. Nothing outside the repository is changed without asking first: no
   shell profiles, no system settings, no global package installs.
6. Everything installed is open source and comes from the project's own
   release page or package registry, never a third-party download site.
   The platform notes name each project, its licence and its source, and
   the contributor hears all three before anything is fetched.

**If you are the first on an operating system** (each platform's notes
say which systems a run is recorded on, and when),
the macOS setup is the standard to match, and matching it is part of your
run:

- Install the tools inside `tools/` exactly as the platform's notes say.
- Make the platform's launcher, `kit/<platform>/tools.py`, contain the
  tools' state on your system. On macOS and Linux that is the XDG
  variables it already sets. On Windows find the equivalent (the tool's
  own config and directory options, or environment variables such as
  `APPDATA`) and add it to the launcher for that platform; do not leave it
  to each contributor to remember.
- Run `verify-footprint`. Fix what it finds, or, if something cannot be
  contained, add it to the Uninstall list with its exact path and size.
- Add the locations your system's tools habitually use to
  `home_candidates()` in the launcher, so the check looks in the right
  places next time.
- Write the section for your operating system in the platform's notes,
  replace "no run recorded" with what you ran and when, and record it in your game's
  `kit-feedback.md`.

## Everything goes in `tools/`, and uninstalling is deleting the folder

The kit installs nothing outside this repository. `tools/` is gitignored
and the binary scan skips it. Before installing anything, tell the
contributor what will go there, where and how big, from the table in the
platform's notes, and give them the complete list of what can be left
outside the repository, which the same notes carry under "Uninstall".
**To uninstall, delete the repository folder**, then remove whatever that
list names.

## Start, check, stop

```
python3 kit/scripts/tools.py status
python3 kit/scripts/tools.py stop
python3 kit/scripts/tools.py verify-footprint
```

`kit/scripts/tools.py` hands every command to the platform's launcher,
`kit/<platform>/tools.py`, and that is where the containment lives: it
points each tool's settings, state and cache paths into `tools/`, gives
the tools the terminal they need, and writes their logs to `tools/logs/`.
Do not start the tools by hand. The commands that start each tool are in
the platform's notes. With one platform under `kit/` it is the default;
with more, `--platform <name>` or `KIT_PLATFORM` chooses.

## When the sandbox has no `timeout`

macOS ships no `timeout` command. A long-running probe needs a guard inside
the script, or a background run you poll, rather than `timeout 60 ...`.

## Keep the machine awake

Anything above Bronze can run for hours, mostly unattended, and all of it
happens on the contributor's own computer. Advise the user to enable any 'keep the computer awake while working' features in their agent.

## Health check

`python3 kit/scripts/tools.py status`. Both tools die with the session
that started them; start them again next time.
