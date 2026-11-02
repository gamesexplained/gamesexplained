# Driller — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Spectrum Computing, entry 1521, `https://spectrumcomputing.co.uk/entry/1521/ZX-Spectrum/Driller`, read 2 November 2026: credits, controls, awards, the files below
- The manual, "Federation Briefing", Incentive Software 1987, as `Driller.pdf` on that page (a re-typeset of the 32-page booklet with its page numbers), read 2 November 2026: pages 24 to 32 are the mission, the console, the information screen, drilling, the probe, the jet, laser beacons and Skanners, energy and hints
- The Spanish instructions of the Musical 1 re-release, `Driller(Musical1S.A.).txt` on that page, read 2 November 2026: the key list and the security station
- Crash, March 1988, page 42, the map `games-maps/Driller.jpg` on that page, read 2 November 2026: the sectors, the Spectrum keys
- The game's own screens and stored text (`work/play-start.sna`)

## Features

| Feature | Status | Where |
|---|---|---|
| Security input station: a page, line and word of the Federation Briefing to type before play | live | answered with IMPROVE for page 17, line 4, word 1; the table of 128 words is at `$ABC1`, checked against the manual |
| Three wrong answers end the game | traced | the counter at `$CAA6`; on 3 it clears memory and jumps to `$0000` |
| Control options: keyboard, Sinclair, Kempston or Cursor joystick | live | menu text at `$C932` |
| Move forward, back (O, K), turn left, right (Q, W) | open | |
| Fire laser at the cursor (0); in movement mode only to the centre, with the cursor on | open | |
| Space toggles movement and attack mode; in attack mode the keys move the cursor | open | |
| Look up, down (P, L) | open | |
| Angle of turn, 5 to 90 degrees (A, Z) | open | |
| Step size, 1 to 250 units (S, X) | open | |
| Rise, fall (R, F): the probe's body up to a fixed height; the jet flies | open | |
| U-turn (U) | open | |
| Tilt left, right (N, M) | open | |
| Cursor on and off (+) | open | |
| Drill (D): a rig is teleported in front of the probe; costs energy | open | |
| Collect the rig (C) | open | |
| Information screen (I): area, rig status, gas found, % tapped, gas tapped, total and safe sectors; L load, S save, 1 abort | open | text at `$C2B2` |
| Load and save a position to tape (or disc) | open | text at `$8F07`, `$C838` |
| 18 sectors to make safe; a sector is safe when its rig taps 50 % or more of the gas | open | |
| The closer the rig to the gas centre, the more gas tapped | open | |
| A flame at the apex of a rig that drilled successfully | open | |
| Rigs cannot be placed from the jet ("NOT IN PROBE") | open | message at `$8BF6` |
| One rig per sector | open | "ALREADY PLACED" |
| Countdown to the meteor strike; the game ends at zero | open | starts at 4:00:00 |
| Success rating (score) | open | |
| Energy and shield bars; the game ends when either runs out | open | "SHIELD OUT", "ENERGY OUT" |
| Energy and shield crystals: shoot one to absorb it | open | |
| Laser beacons fire at the player in range and never miss | open | |
| Skanners orbit Mitral and are likely armed | open | |
| A Ketar reconnaissance jet: dock by driving under it; land on the probe to go back | open | "KETAR HANGAR" area name |
| The jet is lightly armoured and flies; it cannot drill | open | |
| A fall from too high ends the game | open | "NASTY FALL" |
| Teleports to the opposite side of the moon | open | Crash map key |
| Switches that open doors and make buildings disappear | open | Crash map key |
| Mines and danger zones | open | Crash map key |
| Plan view and side view indicators on the console | open | |
| X, Y and height co-ordinates on the console | open | |
| Message display: defaults to the sector's state | open | "GAS BUILD UP", "SECTOR CLEARED", "AREA NEUTRAL" |
| Area names | open | Amethyst, Lapis Lazuli, Emerald, Topaz, Obsidian, Basalt, Ochre, Graphite, Trachyte, Ruby, Malachite, Aquamarine, Beryl, Niccolite, Alabaster, Opal, Quartz, Diamond, Mitral, the Stores, the K1 to K4 complexes, the Linker, the Ketar hangar |
| Freescape: solid 3D, any position, look any way | live | the play view |

## Beyond the documentation

- The security check accepts only capital letters (`$41`-`$5A`) and at
  most ten of them. A right answer also writes `$DD` and `$E5` over the
  two bytes at `$6B12`, which the tape holds as `JR $6B12`, a jump to
  itself: a copy that skips the question hangs there (`orientation.md`).

## Open questions

- Which of the two crystal kinds gives energy and which shield: the
  manual says only that experience tells them apart.
- What the time limit is in the code, and whether the clock runs at the
  game's frame rate or on the interrupt.
