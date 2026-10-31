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
| Three styles: regular, volunteer, volunteer hazardous; said to change damage tolerance, cannon effect and Hind activity | traced: the style (`zpa_4C`) gates hits on the helicopter, how many hits stop the engines, the cannon's range and the Hind's take-offs | `front`; `flight` `$5AE5`, `$3D60`, `$598D` |
| Reality levels (flight model, landings, winds and temperature) | live | `front` |
| Overall risk shown on the menu | live | `front` |
| Briefing with primary and secondary missions at map coordinates | live | `front` |
| Map and intelligence screens, sick call | open | `front` |
| Checklist before take-off | live | `front` |
| Arming: weapons loads chosen within a weight limit | live | `front` |
| Night missions | traced: half a page more of `CH`, units see half as far, the night window colours, the target box a step lighter | `front`; `flight` `$0A24`, `$5495`, `$3CB6` |
| Weather: wind and temperature change the load the helicopter can lift | traced for the wind, added to the position every second pass; the temperature open | `front`; `flight` `$3B10` |
| Engines 1 and 2, rotor clutch 3, collective on F1/F3/F5/F7 | live | `flight` |
| Pitch and roll on the joystick; yaw on the cursor keys (only at low speed), RETURN stops the turn | traced | `flight` `$370F`, `$353A`, `$35AD`, `$348D` |
| Sidewinder, FFAR, Hellfire, 30 mm cannon on keys 4 to 7 | traced | `flight` `$348D`, `$3E1E`, `$3D60` |
| Chaff (9), radar jammer (0), infrared jammer (+), flares (-) | traced | `flight` `$34FC`, `$353A` |
| Views to the side and forward (DEL, £, HOME) | traced | `flight` `$3383` |
| Target switching with right SHIFT; the target box's colour shows the chance of a hit | traced: four colours by distance and aim | `flight` `$3383`, `$3CB6`, `$53A4` |
| CRT display cycled with SPACE (map, target, messages); big map on Z | traced | `flight` `$332E`, `$9614` |
| Damage display (left SHIFT), weapons display (C=) | traced: each picture is loaded from side 2 when asked for | `flight` `$332E`, `$999E` |
| Pause (RUN/STOP), fast motion on ← in the map view | traced | `flight` `$3383`, `$332E` |
| RESTORE with a weapon key jettisons it; RESTORE with RUN/STOP aborts | traced | `flight` `$35AD`, `$332E` |
| Hills drawn filled, block line of sight and can be hit | traced for the drawing and the line of sight; a hill hit open | `flight` `$A163`, `hill_between` |
| Missiles and shells as sprites | traced: five sizes by distance, launch smoke from each wing, six explosion frames | `flight` `$958F`, `$7200` |
| Hind helicopters as airborne enemies | traced: one Hind, from a base unit, flying at the helicopter and back | `flight` `$5727`, `$598D`, `$53FB` |
| Password and countersign to land at a friendly base | traced: a checksum of the typed countersign against the codeword's; two wrong tries set every damage bit | `flight` `challenge`, `$E741` |
| Landing judged on speed and rate of descent, near the T | traced for speed and sink rate; the T open | `flight` `$39CC`, `debrief` |
| Mission result summary: rank, time, landing, position, damage, missions, wounds | live | `debrief` |
| Medals and promotion up to colonel, then brigadier general | open | `debrief`, `base` |
| What next after landing: inspect, take off again, rearm, repair, leave | live | `base` |
| Points subtracted after a mission longer than 20 minutes | open | `debrief` |
| Cheat (wiki): unlimited ammunition, `POKE 23082,189` | traced: `$5A2A` is the DEC that takes from a store; 189 makes it an LDA | `flight` `use_store` |
| Cheat (wiki, "Master .d64 version"): no damage, no fuel use | open | `flight` |

## Beyond the documentation

Found in the code, not in the manual.

- The non-time-critical parts are BASIC (the wiki says so too): the title,
  the front end, the debriefing and the base are BASIC programs calling a
  machine-code library through a jump table at `$7500`.
- The front end hands the mission to the flight through the cassette
  buffer at `$033C`: BASIC lines 713-743 of `BEGIN` write it, and side 2's
  programs read it.
- Each ground unit falls to one missile kind only: the table at `$B5A4`
  gives each unit kind the FFAR, the Hellfire or the Sidewinder, and a
  missile of another kind that hits it does nothing (`$B2F1`). The Hind,
  unit 5, falls to any missile (`$B309`), and no unit in the five
  theatres' files is of the two kinds the table gives the Sidewinder.
- In training nothing ever hits the helicopter, and on a mission the
  style sets what share of the enemy's shots hit: a quarter, a half or
  three quarters (`$5AE5`, `facts.md`).
- The joystick reads nothing unless CIA 2's two timers still keep the gap
  the library set on side 1 (`joystick`, `$E40C`).
- On a C128 the engine switches to 2 MHz while the raster is below the
  picture, and back to 1 MHz at its top (`$9110`, `$948F`).
- Messages the CRT can show include "SURV RADAR ALERT: ENEMY HIND
  HELICOPTER AIRBORNE" and "CEASE FIRE / FRIENDLY TROOPS HAVE BEEN HIT"
  (`$7A52`, `$7A83`).
- Five of the six BASIC programs, all but `B`, the debriefing, start with
  a line of `REM`, five DEL characters and a shifted L (line 0, or line 1
  in `BEGIN`): LIST rubs out the line's number and `REM` and stops at once
  with `?SYNTAX ERROR`, so the program cannot be listed (*live* for `G2`,
  `facts.md`).
- The cannon fires only with the CRT on the target view (`$3D60`): with
  the map or a message up, fire with a target picked moves the CRT on.
- The C64-Wiki's unlimited ammunition POKE fits this build; its fuel and
  damage POKEs are for another (`cheats.md`).

## Open questions

None that the code leaves open. The roster's changes go through two
hands: the flight leaves its variables in the copy of its zero page at
`$3F00` (`swap_zp`, `$919B`), the debriefing `B` reads them there (lines
4-5) and copies the ones the base needs into the cassette buffer at
`$033C` (lines 59-62), and the base program `E` saves the roster.
