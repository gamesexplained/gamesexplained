# The Last Ninja — kit feedback

## Skill text that changed what I did

- `10-orient`: “Read the file's header before trusting its name” led to checking both TAP format bytes before using the tape scanner.

## What was changed in the kit

None.

## What cost the most time

VICE disabled warp as the KERNAL handed off to Cyberload. Restoring
warp after the yellow Cyberload banner made the second cold boot
take about 73 seconds.

The kit's emulator check preserved gameplay access through MCP, but
the separate remote monitor reset its connection for `tapeoffs`.
A restart may be needed before tape position and execution-map
commands are used.

## Candidates

For cassette orientation, check warp again after the KERNAL gives
control to a second-stage loader.
