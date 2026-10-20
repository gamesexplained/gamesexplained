# Apple2TS workarounds, by failed check

Read this only for the checks that `python3 kit/scripts/tools.py --platform
apple2 check-emulator` reported as failed on the build you are using. Each
section names the checks it covers. If nothing failed, none of this applies,
unless the summary says the host is slow: that is a NOTE, not a failed check,
and "A slow host" below is for it.

Measured on **Apple2TS 3.7.0** (the tag v3.7.0, commit c900979), in the kit's
server (protocol 1), under Node 22.22.0 on Linux x86_64, on **20 October
2026**: 49 passed, 0 failed, the II Plus's seven among them, in 8 seconds,
the same in two runs. No
check fails on that build, so there is no section for one. When a later
build fails a check, add a section here named after it, with what to do
instead, and delete the section when a build passes it again.

## A slow host

No check fails for the host's speed. The checks count against the test
program's own counters, and the speed is reported on lines of its own:
`warp` gives how many times real time the machine ran with nothing hooked,
kept under `speed` in the result, and a `NOTE` follows when that is below
twice real time. A second `NOTE` follows when a call made during a run
waited more than half a second: calls are answered between two slices of
50,000 cycles, and a slow host runs a slice slowly.

On such a host, plan long waits (a loader, a tune to record) in the
machine's time, frames and cycles, never the host's. A script that waits a
fixed number of seconds for a stop can give up before the stop arrives:
wait on the run's own reply.

## A phase did not finish

`no-exception`

A phase stopped on an error before its last check, and the script went on
to the next phase. The checks after that point did not run and are in
neither the passed nor the failed list; `no-exception` is counted in their
place. The traceback printed under the phase's heading says what went
wrong.

Run `tools.py --platform apple2 status` first. If the emulator is down, the
server stopped: its log is `tools/logs/apple2ts.log`. Start it again and
rerun `check-emulator`. If the same phase stops again, treat the checks it
did not reach as failed: they are the ones after the last result printed
under its heading, in that phase's function in
`kit/apple2/check_emulator.py`.
