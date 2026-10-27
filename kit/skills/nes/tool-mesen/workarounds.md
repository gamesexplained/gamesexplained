# MesenCE workarounds, by failed check

Read this only for the checks that `python3 kit/scripts/tools.py --platform
nes check-emulator --emulator mesen` reported as failed on the build you are
using. Each section names the checks it covers. If nothing failed, none of
this applies, unless the summary says the host is slow: that is a NOTE, not
a failed check, and "A slow host" below is for it.

Measured on **MesenCE 2.2.1**, its GitHub release for Apple silicon, in the
kit's server (protocol 1), under Python 3.9.6 with SDL2 2.32.10 on macOS, on
**26 October 2026**: 36 passed, 0 failed, in 23 to 24 seconds, the same in
three runs. No check fails on that build, so there is no section for one.
When a later build fails a check, add a section here named after it, with
what to do instead, and delete the section when a build passes it again.

## Mesen does not start

No check runs: `cartridge` answers that Mesen started but its script never
connected, or the server's log (`tools/logs/mesen.log`) says Mesen ended at
once. Read `tools/logs/mesen-<port>.log`, which is Mesen's own output. A
missing SDL2 is the likely cause on macOS and Linux: `sdl2-config
--version` says whether it is there (`kit/nes/INSTALL.md`, "What you need
first"). A missing or changed `settings.json` beside Mesen's program is the
other: Mesen then opens its first-run window and never runs the script.
`get-mesen` writes it again.

## A slow host

No check fails for the host's speed. The bridge calls into Lua before every
instruction, so MesenCE runs at about twice real time where jsnes runs at
seventeen, and `warp` adds a `NOTE` below twice real time: on a slower
computer than the one measured, expect it. Plan long waits in the machine's
time, frames and cycles, never the host's, and wait on a run's own reply
rather than for a number of seconds.

## A phase did not finish

`no-exception`

A phase stopped on an error before its last check, and the script went on
to the next phase. The traceback printed under the phase's heading says what
went wrong. Then read `tools/logs/mesen-bridge-<port>.log`: an error inside
the bridge is written there, and after one the machine may have run on by
itself. Start the server again (`tools.py stop mesen`, `tools.py mesen`) and
rerun `check-emulator --emulator mesen`. If the same phase stops again,
treat the checks it did not reach as failed.
