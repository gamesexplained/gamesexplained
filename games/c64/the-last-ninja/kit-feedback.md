# The Last Ninja — kit feedback

## Skill text that changed what I did

- `10-orient`: “Read the file's header before trusting its name” led to checking both TAP format bytes before using the tape scanner.

- `50-coverage`: “A description belongs to a routine, not to every branch target inside it” kept the boundary dispatch grouped by routine. The later pass named the cases where a separate table or stored operand shared the same addresses.
- `60-verify`: “a value the game immediately overwrites and every read is a sample of” led to using the moving CIA timer in the live power-meter check.

## What was changed in the kit

None.

## What cost the most time

VICE disabled warp as the KERNAL handed off to Cyberload. Restoring
warp after the yellow Cyberload banner made the second cold boot
take about 73 seconds.

The kit's emulator check preserved gameplay access through MCP, but
the separate remote monitor reset its connection for `tapeoffs`.
Stopping VICE outside the shell sandbox and restarting through the
launcher recovered the monitor. The Side 2 attach then worked.

## Candidates

For cassette orientation, check warp again after the KERNAL gives
control to a second-stage loader.
