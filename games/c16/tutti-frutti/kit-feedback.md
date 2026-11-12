# Tutti Frutti — kit feedback

## Skill text that changed what I did

- `10-orient`: "Save the hand-over too": This prompted two stops. At the earlier SYS, $2000 contained the publisher's glyphs. After the second unpack it contained the engine entry.
- `20-features`: "Test each control from a moment you have looked at": This prompted reloading the same stationary player for each input. This established the alternative keyboard controls and the distinction between the two fire ports.
- `60-verify`: "Retained bytes from earlier phases": This prompted a write watch at $033F across both unpacks. It showed which phase left the delay before the first slide.
- `60-verify`: "Something ran between the poke and the read": This prompted counting subsequent ticks separately from the push tick. Motion began after the 126 decrements, on tick 127.
- `70-minisite`: "Draw from the memory the game draws from": This prompted matching the screenshot against the next saved frame. The spawn's four cells had changed color by then.

## What cost the most time

Tracing the slide timer required separating the two unpacks, the
per-round actor reset, and the first use of the slot. The existing
retained-bytes and same-state control rules covered the checks.

## Tools and host

Linux x86_64, Python 3.12.3, g++ 13.3.0. The reused plus4emu build at
939e652 passed 46 checks on each PAL model, with a clean footprint.
The Plus/4 check was rerun after its concurrent invocation stopped
before the restart test. The disassembler ran in the kit's Plus/4
mode on its own port through the stdio bridge.

## Changes to the kit

None. The existing platform tools handled the two-stage PRG.

## Maintainer asks

None.
