# Rambo: First Blood Part II — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/50-coverage`: "Look for a routine that takes its own return address off the stack, reads what follows the call through it": found the text printer at $C077 and its 18 inline script addresses, typed them as data and restarted the disassembly after each.
- `kit/skills/core/50-coverage`: "makes the disassembler mint a symbol": explained the nine symbols the music driver's BIT skips minted in other routines and tables, instead of describing them as variables.
- `kit/skills/c64/tool-vice-mcp`: "reach the monitor only through `codemap.py`": did not, at first; a raw socket to the monitor wedged the emulator twice before the run went back to `codemap.monitor()`.

## What was changed in the kit

- `kit/c64/INSTALL.md`: a row for the v3.14.0 release on macOS arm64, 57 of 57 on 2 November 2026 (a new build on a kind of computer with no row; `site/status.json`'s macOS cell says the same).
- `kit/skills/c64/tool-vice-mcp/SKILL.md`, the protected-originals bullet: a snapshot holds the drive's RAM in its `DRIVECPU0` module, 114 bytes in. Lesson: `kit/lessons/2026-11-02-rambo.md`.

## What cost the most time

Getting the disk to load took about an hour and a half of the run: the
C64's side looked right, and the answer was in the drive's own code. The
change that would have saved the most is the one made above: knowing that
a snapshot carries the drive's RAM, so the drive code can be read at once
instead of through the monitor.

Other costs, each written where the next run will search:

- VICE's text monitor wedged three times (a `chis` longer than
  `codemap.monitor()` waits, and commands sent on a connection the monitor
  had left). `agent-history.md` has the details; the tool notes already
  say to use `codemap.py`.
- The disassembler re-decoded inline arguments as code whenever a later
  trace passed over them, three times in this run; typing them again after
  the last disassembly held.
- Typing a data range by its end address once swallowed the start of two
  routines; `check_listing.py` would have caught it through the code map,
  and re-reading the region did.

## Operating system and tools

macOS 27.0 on Apple silicon; VICE (vice-mcp) v3.14.0 and v3.13.2 macOS
arm64 release builds, both 57 of 57 on `check-emulator`; regenerator2000
from `tools/cargo/bin`; Python 3.12; Node.js 25.8.1.

## Asks for a maintainer

None. One kit test failed on this Mac, unrelated to this branch:
`kit/c64/test_stdio_bridge.py` compares a temporary path as `/private/var/...`
with the same path as `/var/...` (macOS's `/var` is a symlink), so
`test_snapshot_conversion_preserves_ram_and_previous_project` fails; the
other 453 tests passed and 9 skipped (`python3 kit/scripts/test_kit.py`).

## Candidates

- **A file the emulated drive cannot find, after a protection renumbers
  the drive's jobs.** The XROM loader's first file open after its hidden
  directory gets "62, FILE NOT FOUND" in VICE, and the next open of any
  file works. Green Beret, with the same loader, booted without it on
  Linux, so whether it is this G64 or this host is open. If another XROM
  disk shows it, the tool notes could say to retry the loader's own call.
