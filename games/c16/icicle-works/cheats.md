# Icicle Works: cheats

These changes are for RAM after this supplied Plus/4 version has started.
Use an emulator monitor with your own copy. Each change lasts for that RAM
session. Restore a clean snapshot to undo it. The published listing and
article use the unmodified program.

| Effect | Monitor write | Original byte | Live check |
|---|---|---|---|
| Hold the countdown | `$6B0B = $00` (decimal 27403) | `$01` | Changed the countdown's subtraction from 1 to 0. Time held for 110 PAL frames. |
| Keep spare lives when losing a life | `$64D5 = $00` (decimal 25813) | `$01` | Changed the spare-life subtraction from 1 to 0. RUN/STOP sacrifice and the following restart left two spare lives. |

Tested in plus4emu 1.2.11 on PAL Plus/4. A BASIC POKE before startup is not
an equivalent test: the packed program replaces these addresses while loading.
