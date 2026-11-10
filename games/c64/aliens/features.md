# Aliens — features

Statuses: **open** (documented, not found in the code yet), **traced**, **confirmed**, **live** (observed in the emulator), **differs**.

Sources:

- *Aliens: Exterminator's Sourcebook*, Activision's manual for the C64 and C128, https://www.mocagh.org/activision/aliens-manual.pdf, read 10 November 2026
- Wikipedia, "Aliens: The Computer Game (US Version)", https://en.wikipedia.org/wiki/Aliens:_The_Computer_Game_(US_Version), read 10 November 2026
- the game's own screens, run in the emulator on 10 November 2026

## Features

| Feature | Status | Where |
|---|---|---|
| Six levels in a fixed order: drop-ship, APC rescue, operations room, air duct maze, Newt rescue, Queen fight | live | each reached through its status code; see `reference/` |
| Each level is introduced by text briefings and speech-balloon scenes advanced with RETURN | live | story text is in the engine, `$13BE`-`$2210` |
| Mission status codes, one per level, entered at "Colonial Marines status update" | live | codes `7324G`, `2727H`, `1506E` (levels 1 to 3) and the others are from the trainer's list; the engine holds the prompts at `$165A` and `$15DF` |
| Equipment identification (glove cursor, joystick fire) before level 1 | live | `reference/equipment-identification.png`; code open |
| Level 1: the drop-ship follows a pipe, with a profile compliance indicator | live | code open |
| Level 2: four marines on monitors, F1 F3 F5 F7 switch, a motion tracker | live | switching keys not tested; code open |
| Level 3: a marine with a flame thrower holds off aliens dropping from the ceiling | live | code open |
| Level 4: overhead maze, one third on screen at a time, hand grenades cost a marine | live (the maze); grenades open | code open |
| Level 5: 17-minute clock, 99 rounds, flares dropped with the space bar, range locator | live (clock, ammo, flares display) | code open |
| Level 6: Ripley in the power-loader against the Queen | live (scene only) | code open |
| Music and sound effects by Russell Lieblich | open | the SID writes are at `$09D0`-`$0A65` and `$2800`-`$2AB6` in the engine |
| RUN/STOP + RESTORE replays a level; RETURN advances | open | RETURN in play ended the level in the emulator |

## Beyond the documentation

- The disk is a crack. Its trainer lists a menu of cheats across the levels (for example "unlimited time" and "wanna have 255 flares") and the six level codes.

## Open questions

- Every mechanic's code: only the engine has a disassembler session, and it is not yet annotated.
- Which of the ten packed files holds which level, and how the cracker's loader packs them.
- Whether the original (uncracked) game's code differs from this disk's in the engine.
