# Gunship — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Gunship", https://www.c64-wiki.com/wiki/Gunship, read 31 October 2026
  (description, controls, weapons, passwords, cheats, roster corruption bug)
- this run's own play in VICE, side 1 and side 2 of the C64 Preservation Project images

## Features

| Feature | Status | Where |
|---|---|---|
| Animated title: a helicopter flies in, rotors turn, "Ride of the Valkyries" plays | live | `title` |
| Vehicle identification at start (copy protection): a random picture, the answer from the manual; a wrong answer allows only a training flight | live | `front` |
| Pilot roster of up to eight pilots saved on side 1, with rank, medals and points | live | `title`, `front`, `base` |
| Roster corruption: "ROSTER DATA HAS BEEN CORRUPTED!" and the roster cleared | live (the text, in the boot program) | `title` |
| Five duty assignments: training in the USA, Southeast Asia, Central America, Middle East, Western Europe | live | `front` |
| Three styles: regular, volunteer, volunteer hazardous; said to change damage tolerance, cannon effect and Hind activity | open | `front`, `flight` |
| Reality levels (flight model, landings, winds and temperature) | live | `front` |
| Overall risk shown on the menu | live | `front` |
| Briefing with primary and secondary missions at map coordinates | live | `front` |
| Map and intelligence screens, sick call | open | `front` |
| Checklist before take-off | live | `front` |
| Arming: weapons loads chosen within a weight limit | live | `front` |
| Night missions | open | `front`, `flight` |
| Weather: wind and temperature change the load the helicopter can lift | open | `front` |
| Engines 1 and 2, rotor clutch 3, collective on F1/F3/F5/F7 | live | `flight` |
| Pitch and roll on the joystick; yaw on the cursor keys (only at low speed), RETURN stops the turn | open | `flight` |
| Sidewinder, FFAR, Hellfire, 30 mm cannon on keys 4 to 7 | open | `flight` |
| Chaff (9), radar jammer (0), infrared jammer (+), flares (-) | open | `flight` |
| Views to the side and forward (DEL, £, HOME) | open | `flight` |
| Target switching with right SHIFT; the target box's colour shows the chance of a hit | open | `flight` |
| CRT display cycled with SPACE (map, target, messages); big map on Z | open | `flight` |
| Damage display (left SHIFT), weapons display (C=) | open | `flight` |
| Pause (RUN/STOP), fast motion on ← in the map view | open | `flight` |
| RESTORE with a weapon key jettisons it; RESTORE with RUN/STOP aborts | open | `flight` |
| Hills drawn filled, block line of sight and can be hit | open | `flight` |
| Missiles and shells as sprites | open | `flight` |
| Hind helicopters as airborne enemies | open | `flight` |
| Password and countersign to land at a friendly base | open | `flight` |
| Landing judged on speed and rate of descent, near the T | open | `flight`, `debrief` |
| Mission result summary: rank, time, landing, position, damage, missions, wounds | live | `debrief` |
| Medals and promotion up to colonel, then brigadier general | open | `debrief`, `base` |
| What next after landing: inspect, take off again, rearm, repair, leave | live | `base` |
| Points subtracted after a mission longer than 20 minutes | open | `debrief` |
| Cheat (wiki): unlimited ammunition, `POKE 23082,189` | open | `flight` |
| Cheat (wiki, "Master .d64 version"): no damage, no fuel use | open | `flight` |

## Beyond the documentation

Found in the code, not in the manual.

- The non-time-critical parts are BASIC (the wiki says so too): the title,
  the front end, the debriefing and the base are BASIC programs calling a
  machine-code library through a jump table at `$7500`.
- The front end hands the mission to the flight through the cassette
  buffer at `$033C`: BASIC lines 713-743 of `BEGIN` write it, and side 2's
  programs read it.

## Open questions

- Each BASIC program's first line is `REM`, five DEL characters and a
  shifted L (`$CC`, a byte with no keyword): what LIST does with it.

- What `CP`, `CH`, `AWH` and the `M.<theatre><n>` files hold.
- Where the flight engine stores the roster's changes before the base
  program saves them.
