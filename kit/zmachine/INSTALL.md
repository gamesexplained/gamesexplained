# Tools for the Z-machine

Read `kit/INSTALL.md` first: the footprint principle is the same here.
The Z-machine is not a platform. It is the computer Infocom wrote its
games for, and every machine the games were sold for ran it through an
interpreter of its own, so a game's story file runs the same under any
faithful interpreter, whatever its platform. The platform's kit explains
the machine's interpreter; this one runs and checks the story, for every
platform, and needs no `--platform`. How to use it is
`kit/skills/cpu/zmachine`.

| Need | Capability | Recommended tool |
|---|---|---|
| An interpreter that traces | run a story from a file of commands, the same each run, and write every instruction it runs with its operands, the variables it wrote, where it went and what it printed | Bocfel 2.6 (https://cspiegel.github.io/bocfel/), built from its release with the kit's trace, `kit/zmachine/bocfel_trace.cpp` |
| A reader and a disassembler | every version's header, text, objects, dictionary and instructions | the kit's own `kit/zmachine/story.py` and `zcode.py`, Python alone |

Bocfel was chosen because it runs every version Infocom shipped but the
graphical version 6 with nothing beyond standard C++, it is maintained
(2.6 came out on 6 September 2026), and it encodes a typed word in
versions 1 and 2 as the Standard and Infocom's own dictionaries do, which
Frotz 2.55 does not (`kit/skills/cpu/zmachine`, "Words with two characters of
another alphabet").

## What you need first

**GNU make and a C++17 compiler**, which the kit does not install: g++ or
clang++. `make --version` and `c++ --version` say whether they are there.
On Linux they are the distribution's build tools; on macOS, Apple's
command line tools. **Python 3**, which runs the kit.

## Start, check

```
python3 kit/scripts/tools.py get-bocfel                    # download Bocfel 2.6, check its SHA-256, add the trace, build
python3 kit/scripts/tools.py bocfel status                 # which build is there
python3 kit/scripts/tools.py bocfel run <story> --commands <file> --trace <file> --seed 1
python3 kit/scripts/tools.py bocfel verify-footprint       # what a traced run writes outside the repository
python3 kit/zmachine/test_bocfel.py                        # the kit's reader against Bocfel, versions 1-5, 7 and 8
```

Bocfel runs in the terminal and opens nothing: it reads commands from
standard input and writes the game's text to standard output, and stops
when the story quits or the commands run out. There is nothing to stop.

**Which build: 2.6, and only after measuring a newer one.** `get-bocfel`
downloads the release tarball from Bocfel's own site and refuses it if
its SHA-256 is not the one in `kit/zmachine/bocfel.py`. The kit's trace
adds two files and eight edits to Bocfel's source, each of which must
match exactly once, so a release that has moved what the kit edits stops
the build with a message instead of tracing wrong. To move on, change
`VERSION` and `SHA256` in `kit/zmachine/bocfel.py`, run `get-bocfel`,
`test_bocfel.py` and `verify-footprint`, and change the row here.

| Build | Machine | Measured | Checks passed |
|---|---|---|---|
| Bocfel 2.6 from its release tarball, the plain build with the kit's trace, g++ 13.3.0, GNU make 4.3 | Linux x86_64 (Ubuntu 24.04, no display) | 27 October 2026 | `test_bocfel.py` 3 of 3: the opcode table, and nine test stories, 4,043 instructions at 2,069 addresses; built in 7 s; `verify-footprint` clean |

## What goes where, and what is left behind

Tell the contributor this before installing anything:

| What | Where | Size |
|---|---|---|
| Bocfel 2.6's release tarball | `tools/zmachine/bocfel-2.6.tar.gz` | 197 KB |
| Its source, with the kit's trace, and the program built from it | `tools/zmachine/bocfel-2.6/` | 7.5 MB, the program 6.9 MB of it |
| The home directory it runs with | `tools/zmachine-home/` | four empty folders, and the test's stories while it runs |

What it is, and say so when you ask: Bocfel is Chris Spiegel's
open-source Z-machine interpreter, MIT licence, the engine of the
Gargoyle and Parchment interpreters. `get-bocfel` downloads its release
from the project's own site, checks it, unpacks it into `tools/zmachine/`
and builds it there with the computer's own make and compiler; the
object files are deleted after the build. On 27 October 2026 a fresh
install took 7 s and wrote nothing outside the repository.

The kit runs Bocfel with `HOME` and the XDG folders pointed at
`tools/zmachine-home/`, its configuration file and its patches to
Infocom's games off, and its own commands (the ones that start with `/`)
off unless `--meta` asks for them.

**Uninstall:** delete the repository folder. The compiler and make, if
they were installed for this, are the only things left outside it.

## Linux

Run on Linux x86_64 (Ubuntu 24.04 in a cloud container, no display,
g++ 13.3.0, GNU make 4.3, Python 3.13) on 27 October 2026: `get-bocfel`
built in 7 s from a fresh download, `test_bocfel.py` passed, and
`verify-footprint` was clean, with nothing written outside the repository
by the install or by a traced run.

## Untried systems

No run is recorded on macOS or Windows. Bocfel's plain build needs
nothing but GNU make and standard C++, so `get-bocfel` should work on
macOS with Apple's command line tools; on Windows it needs GNU make and a
compiler such as MinGW's, and the program is `bocfel.exe`. Run `get-bocfel`, `test_bocfel.py` and
`verify-footprint` there and write the section here, as `kit/INSTALL.md`
says.
