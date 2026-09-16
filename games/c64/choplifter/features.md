# Choplifter — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources: the C64 entry on c64-wiki (`https://www.c64-wiki.com/wiki/Choplifter`),
the game's own title screen, and play in the emulator.

## Features

| Feature | Status | Where |
|---|---|---|
| Helicopter flown with a joystick in control port 1 | live | read at `$DC01` from `$976A`, `$97AD`, `$A71A`, `$A741` |
| Fire button shoots | open | |
| Fire button plus left or right turns the helicopter to face that way | open | |
| 64 hostages in total | open | `$0CEE` is compared with `#$40` at `$967C` |
| Hostages are held in sheds that have to be opened | open | |
| At most 16 hostages ride in the helicopter at once | open | |
| Hostages are carried back to the base | open | |
| Status bar counts hostages killed, aboard and delivered | live | three counters drawn in the top bar |
| Tanks attack from the far side of the border | open | |
| Jets appear after the first sortie | open | |
| Drones appear on the third sortie | open | |
| Three helicopters (lives) | open | |
| Sorties are announced as FIRST / SECOND / THIRD SORTIE | confirmed | message table at `$8AD7`, strings `$8AE1`-`$8B1D` |
| THE END and MAGNIFICENT! end messages | confirmed | same table |
| RUN/STOP pauses | open | |
| Q ends the game | open | |

## Beyond the documentation

Found in the code, not in the manual.

- The program is a 16 KB cartridge image: `$8000`-`$8008` is a C64
  autostart header (cold and warm vectors both `$9593`, then the `CBM80`
  signature).
- No hardware sprites are used. `$D015` is never written by the game and
  reads `0` during play; every moving object is drawn into a multicolour
  bitmap by software.
- The play area is double buffered: two complete bitmaps, one in VIC bank 0
  at `$2000` and one in VIC bank 1 at `$6000`, swapped by `$8D16` and
  `$8D1F`.

## Open questions

- Which of the 75 shapes in the table at `$8009` belongs to which actor.
- The exact per-sortie difficulty parameters.
